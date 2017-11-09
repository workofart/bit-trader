const tickers = require('./mapping');
const util = require('util');
const WebSocket = require('ws');
const moment = require('moment');
const _ = require('underscore');
const tulind = require('tulind');

/************ Custom Functions **********/
const indicators = require('./indicators');
const utilities = require('./util');
const db = require('./store');
const executor = require('./executor');
const automation = require('./automation');
/***************************************************/

/**************** WebSocket Client (From Bitfinex) *****************/
const URL = 'http://127.0.0.1:3001/api/';
var connection;
/***************************************************/

/**************** WebSocket Server (to UI) *****************/
const connection_to_client = new WebSocket.Server({host: '127.0.0.1', port: 1338})
connection_to_client.on('request', (req) => {
    req.accept();
})

/***************************************************/

var indicatorFlags = {
    'ADX' : true,
    'RSI' : true,
    'DEMA_SMA_CROSS' : true,
    'PSAR' : true
}

/************** OrderBook Parameters **************/
const DEMAND_SUPPLY_SPREAD_MULTIPLIER = 1.1;
const DEMAND_SUPPLY_DISTANCE = 3; // Demand is N times Supply, vice versa
const SPREAD_THRESHOLD = 0.01; // 1% of bid/ask average, volatile if pass this threshold
const AGGREGATE_SUPPLY_DEMAND_BASE = 1; // the base score for this subsignal
/***************************************************/

util.log('--------------- OrderBook Parameters --------------')
util.log(`\nDEMAND_SUPPLY_SPREAD_MULTIPLIER: ${DEMAND_SUPPLY_SPREAD_MULTIPLIER}\nDEMAND_SUPPLY_DISTANCE: ${DEMAND_SUPPLY_DISTANCE}\nSPREAD_THRESHOLD: ${SPREAD_THRESHOLD}\nAGGREGATE_SUPPLY_DEMAND_BASE: ${AGGREGATE_SUPPLY_DEMAND_BASE}`)

/************** Investment Parameters **************/
var wallet = 10000;
var currencyWallet = {};
var latestPrice = {};
const INITIAL_INVESTMENT = 10000;
const INVEST_PERCENTAGE = 0.05;
const BUY_SIGNAL_TRIGGER = 50; // if score > this, buy
const SELL_SIGNAL_TRIGGER = -50; // if score < this, sell
const TRADING_FEE = 0.002; // 0.X% for all buys/sells
const MIN_PROFIT_PERCENTAGE = 0.005; // 0.X% for min profit to make a move
const MAX_SCORE_INTERVAL = 90; // The maximum number of data points before making a decision then resetting all signals
const IS_BUY_IMMEDIATELY = false; // if entry point is carefully selected, enable this. Else, disable.
/***************************************************/

util.log('---------------- Investment Parameters --------------')
util.log(`\nINITIAL_INVESTMENT: ${INITIAL_INVESTMENT}\nINVEST_PERCENTAGE: ${INVEST_PERCENTAGE}\nBUY_SIGNAL_TRIGGER: ${BUY_SIGNAL_TRIGGER}\nSELL_SIGNAL_TRIGGER: ${SELL_SIGNAL_TRIGGER}\nTRADING_FEE: ${TRADING_FEE}\nMIN_PROFIT_PERCENTAGE: ${MIN_PROFIT_PERCENTAGE}\nMAX_SCORE_INTERVAL: ${MAX_SCORE_INTERVAL}`)
var orderBook_Bid = [];
var orderBook_Ask = [];
var candles = {};
var tickerPrices = {};
var indicatorStorage = {};

const isCandleEnabled = false;
const isTickerPriceEnabled = true;
const isOrderBookEnabled = true;

var storedCounts = {};
var storedWeightedSignalScore = {};
var clientWS;
var isClientDead = true;
/************ Pre-Termination Summary ***********/
process.on('SIGINT', function() {
    console.log('Caught termination signal');

    utilities.printWalletStatus(INITIAL_INVESTMENT, wallet, currencyWallet, latestPrice);
    process.exit();
});
/************************************************/
// STARTWS_UI()

// function STARTWS_UI() {
//     connection_to_client.on('open', () => {
//         console.log('Server [bot] started, connected to WebSocket 127.0.0.1:1338')
//     })
//     connection_to_client.setMaxListeners(15)
    
//     connection_to_client.on('connection', function(w, req) {
//         clientWS = w;
//         isClientDead = false;
//     })
//     connection_to_client.on('close', () => {
//         isClientDead = true;
//         console.log('Server [bot] to UI connection closed, reopening')
//     })
// }

connection = new WebSocket('ws://127.0.0.1:1337');
connection.on('open', () => {
    console.log('Client [bot] started, listening to WebSocket 127.0.0.1:1337')
    db.clearTable('bitfinex_transactions')
    db.clearTable('bitfinex_live_price')
    
    // clear the orderbooks to prevent stale prices from keeping the TOB
    orderBook_Bid = [];
    orderBook_Ask = [];
});
connection.setMaxListeners(15)



connection.on('message', (msg) => {
    var msg_parsed = JSON.parse(msg);
    
    if (msg_parsed.hasOwnProperty('id')) {
        console.log('Received client [public_books]\'s id: ' + msg_parsed.id)
    }

        var ticker = msg_parsed.ticker;

        if (msg_parsed.hasOwnProperty('datasource')) {
            
            mainProcessor(ticker, msg_parsed);
        }
})

setInterval(()=>{automation.raceTheBook('BTCUSD', 'buy', orderBook_Ask, orderBook_Bid)}, 500)

/***************************************************/
/*              Main Processor                     */
/*  - collects intelligence from subprocessors     */
/*  - calculates final signal                      */
/*  - trigger buy/sell action                      */
/***************************************************/
var mainProcessor = (ticker, data) => {
    // Extract the symbol
    ticker = ticker.substr(-6);

    // Initialize the scores/counts for a given ticker
    storedWeightedSignalScore[ticker] = storedWeightedSignalScore[ticker] != undefined ? storedWeightedSignalScore[ticker] : 0;
    storedCounts[ticker] = storedCounts[ticker] != undefined ? storedCounts[ticker] : 0;

    // reset signal score and make decision
    if (storedCounts[ticker] >= MAX_SCORE_INTERVAL) {
        if (storedWeightedSignalScore[ticker] != 0 && storedWeightedSignalScore[ticker] != Infinity) {
            // util.log('------------------------------------------------\n\n')
            // util.log(`[${ticker} | Weighted Signal Score: ${storedWeightedSignalScore[ticker].toFixed(4)}\n`)

            invest(storedWeightedSignalScore[ticker], ticker)
        }
        storedWeightedSignalScore[ticker] = 0;
        storedCounts[ticker] = 0;
    }

    // Order books
    if (data.datasource === 'book' && isOrderBookEnabled) {
        // console.log('Received order books: [' + ticker + ']')    
        storedWeightedSignalScore[ticker] += processOrderBook(ticker, data.data);
    }

    // Ticker Prices
    else if (data.datasource === 'ticker' && isTickerPriceEnabled) {
        // console.log('Received ticker price: [' + ticker + ']')
        storedWeightedSignalScore[ticker] += processTickerPrice(ticker, data.data);
    }

    // Candles
    else if (data.datasource === 'candles' && isCandleEnabled) {
        // console.log('Received ticker price: [' + ticker + ']')
        storedWeightedSignalScore[ticker] += processCandles(ticker, data.data);
    }
    storedCounts[ticker] += 1;
}


/***************************************************/
/*              Investment Functions               */
/***************************************************/
function invest(score, ticker) {
    if(latestPrice[ticker] != undefined) {
        var price = latestPrice[ticker];
        var qty =  INVEST_PERCENTAGE * INITIAL_INVESTMENT / price;
        // util.log(`${ticker} : ${price}`)
    
        currencyWallet[ticker] = currencyWallet[ticker] != undefined ? currencyWallet[ticker] : {}
        currencyWallet[ticker].qty = currencyWallet[ticker].qty != undefined ? currencyWallet[ticker].qty : 0
        currencyWallet[ticker].price = currencyWallet[ticker].price != undefined ? currencyWallet[ticker].price : 0
        
        // util.log(`qty: ${qty} | wallet: ${wallet} | price: ${JSON.stringify(price)}`)
        // util.log(`Qty in [${ticker}] wallet: ${currencyWallet[ticker].qty}`)
        // util.log(`Price in [${ticker}] wallet: ${currencyWallet[ticker].price}`)
    
        // BUY
        if (buyPositionCheck(ticker, qty, price, score)) {
            
            wallet -= qty * price * (1 + TRADING_FEE); 
            currencyWallet[ticker].price = (price * qty + currencyWallet[ticker].qty * currencyWallet[ticker].price) / (qty + currencyWallet[ticker].qty); // calculate the weighted average price of all positions
            currencyWallet[ticker].qty += qty;
            
            util.log(`************* Buy | ${qty} ${ticker} @ ${price} *************`)
            utilities.printWalletStatus(INITIAL_INVESTMENT, wallet, currencyWallet, latestPrice);
            db.storeTransactionToDB(ticker, price, qty, 1);
        }
    
        // SELL
        else if (sellPositionCheck(ticker, qty, price, score)) {
            wallet += currencyWallet[ticker].qty * price * (1 - TRADING_FEE); 

            util.log(`************ Sell | ${currencyWallet[ticker].qty} ${ticker} @ ${price} ***********`)
            utilities.printWalletStatus(INITIAL_INVESTMENT, wallet, currencyWallet, latestPrice);
            db.storeTransactionToDB(ticker, price, currencyWallet[ticker].qty, 0);
            currencyWallet[ticker].qty = 0; // clear qty after sold, assuming always sell the same qty
            currencyWallet[ticker].price = 0; // clear the price after sold
        }
    }
    
}

// Checks the long position on hand and evaluate whether
// it's logical to exit the position
function sellPositionCheck(ticker, qty, price,score) {
    var lastPrice = currencyWallet[ticker].price;

    // util.log(`Checking sell position ${lastPrice}`)
    // Can it maintain the min profit requirement and trading fee
    if (score < SELL_SIGNAL_TRIGGER && 
        currencyWallet[ticker].qty > 0 &&
        (price > lastPrice * (1 + MIN_PROFIT_PERCENTAGE + TRADING_FEE))) {
        return true
    }
    else {
        return false
    }
}


// Checks the long position on hand and evaluate whether
// it's logical to enter the position
function buyPositionCheck(ticker, qty, price, score) {
    var lastPrice = currencyWallet[ticker].price;

    // util.log(`Checking buy position ${lastPrice}`)
    // Can it maintain the min profit requirement and trading fee
    if (score > BUY_SIGNAL_TRIGGER &&
        wallet >= qty * price &&
        (lastPrice == 0 || price.toFixed(4) < lastPrice.toFixed(4))) {
        return true
    }
    else {
        return false
    }
}

/***************************************************/
/*              Candle Functions                   */
/***************************************************/

var processCandles = (ticker, data) => {
    var timeStamp;
    var open;
    var close;
    var high;
    var low;
    var volume;

    // Handle the first entry
    if (Array.isArray(data[1])) {
        // for (var i = 0; i < data.length; i++) {
        //     timeStamp = moment(data[i][0]).local().format('YYYY-MM-DD HH:mm:ss')
        //     open = data[i][1]
        //     close = data[i][2]
        //     high = data[i][3]
        //     low = data[i][4]
        //     volume = data[i][5]
        // }
    }
    else {
        timeStamp = moment(data[0]).local().format('YYYY-MM-DD HH:mm:ss')
        open = data[1]
        close = data[2]
        high = data[3]
        low = data[4]
        volume = data[5]

        // var processedData = {
        //     'time' : timeStamp
        // }

        var processedData = {
            'time' : timeStamp,
            'open' : open,
            'close' : close,
            'high' : high,
            'low' : low,
            'volume' : volume,
            'ticker' : ticker
        }
    
        // console.log(processedData)
        // console.log(_.sortedIndex(candles, processedData, 'time'))
        var existingItem = _.find(candles[ticker], (item) => {
            return  item.time === processedData.time
        });
        if (existingItem == undefined) {

            if (!Array.isArray(candles[ticker])) {
                candles[ticker] = []
            }
            candles[ticker].splice(_.sortedIndex(candles[ticker], processedData, 'time'), 0, processedData)
            // console.log(candles)
        }
        // The latest data point might contain the same timestamp but a different price
        // Update the last item in the list with the current price
        else {
            var removedItem = candles[ticker].splice(_.sortedIndex(candles[ticker], processedData, 'time'), 1, processedData)
        }
    }
}

/***************************************************/
/*           Ticker Price Functions                */
/***************************************************/

var processTickerPrice = (ticker, data) => {
    var processScore = 0;

    var ticker = ticker
    var bid = data[0]
    var bid_size = data[1]
    var ask = data[2]
    var ask_size = data[3]
    var daily_change = data[4]
    var daily_change_perc = data[5]
    var last_price = data[6]
    var volume = data[7]
    var high = data[8]
    var low = data[9]

    var processedData = {
        'ticker': ticker,
        'bid': bid,
        'bid_size': bid_size,
        'ask': ask,
        'ask_size': ask_size,
        'daily_change': daily_change,
        'daily_change_perc': daily_change_perc,
        'last_price': last_price,
        'volume': volume,
        'high': high,
        'low' : low,
        'time' : moment().local().format('YYYY-MM-DD HH:mm:ss')
    }

    // console.log(processedData)
    var existingItem = _.find(tickerPrices[ticker], (item) => {
        return  item.time === processedData.time
    });
    if (existingItem == undefined) {

        if (!Array.isArray(tickerPrices[ticker])) {
            tickerPrices[ticker] = []
        }
        db.storeLivePrice(ticker, last_price, bid, bid_size, ask, ask_size, high, low, volume)
        if (clientWS != undefined && !isClientDead) {
            console.log('Sending price data to client through websocket....');
            clientWS.send(JSON.stringify({
                'ticker': ticker,
                'price': last_price,
                'bid': bid,
                'bid_size': bid_size,
                'ask': ask,
                'ask_size': ask_size,
                'high': high,
                'low': low,
                'volume' : volume,
                'time' : moment().local().format('YYYY-MM-DD HH:mm:ss')
            }))
        }
        tickerPrices[ticker].splice(_.sortedIndex(tickerPrices[ticker], processedData, 'time'), 0, processedData)
    }

    processScore += computeIndicators(ticker, tickerPrices[ticker]);

    // Store the latest price into storage for investment decisions
    // util.log(`${ticker} : ${JSON.stringify(tickerPrices[ticker][tickerPrices[ticker].length - 1])}`)
    latestPrice[ticker] = tickerPrices[ticker][tickerPrices[ticker].length - 1].last_price;
    return processScore;
}


function computeIndicators (ticker, data) {
    var subscore = 0;
    var close = _.map(data, (item) => {
        return item.last_price;
    })

    var high = _.map(data, (item) => {
        return item.high;
    })

    var low = _.map(data, (item) => {
        return item.low;
    })
    // console.log('[' + ticker + ']: ' + JSON.stringify(close));

    indicators.initIndicators(indicatorFlags);

    subscore = indicators.calculateRSI(close, subscore);
    subscore = indicators.calculateDEMA_SMA_CROSS(close, subscore);
    subscore = indicators.calculatePSAR(high, low, close, subscore);
    subscore, trendStrength = indicators.calculateADX(high, low, close, subscore);
    return subscore;
}

/***************************************************/
/*           Order Book Functions                  */
/***************************************************/

var processOrderBook = (ticker, data) => {
    var processScore = 0;
    var price, amount, count = 0;

    price = data[0];
    count = data[1];
    amount = data[2];

    syncOrderBook(ticker, price, count, amount);
    processScore += analyzeDemandSupply(ticker, DEMAND_SUPPLY_DISTANCE);
    // console.log('\n\nDemand: ' + demand)
    // console.log('Supply: ' + supply)
    // console.log('Price: {}', price)
    // console.log('Count: {}', count)
    // console.log('Amount: {}', amount)
    return processScore;
}

// Analyzes aggregate demand/supply as well as the spread
function analyzeDemandSupply(ticker, threshold) {
    var subscore = 0;
    var {supply, demand} = calculateDemandSupply(ticker);
    // console.log('[' + ticker + '] demand = ' + (demand / supply).toFixed(2) + ' * supply');

    if (demand > 0 && supply > 0) {
        // Aggregate Demand/Supply
        if (demand > supply * (1 + threshold)) {
            subscore += AGGREGATE_SUPPLY_DEMAND_BASE * (demand / supply)
            // console.log('Price will rise for [' + ticker + ']')
        }
        else if (supply > demand * (1 + threshold)) {
            subscore -= AGGREGATE_SUPPLY_DEMAND_BASE * (supply / demand)
            // console.log('Price will fall for [' + ticker + ']')
        }
    
        // Demand/Supply spread (only act as the multiplier)
        var spreadPercentage = getDemandSupplySpread(ticker)
    
        if (spreadPercentage > SPREAD_THRESHOLD) {
            subscore *= DEMAND_SUPPLY_SPREAD_MULTIPLIER
        }
        // console.log(ticker + ' | Ask Book: ' + Object.keys(orderBook_Ask[ticker]).length)
        // console.log(ticker + ' | Bid Book: ' + Object.keys(orderBook_Bid[ticker]).length)

    }
    return subscore;
}

function getDemandSupplySpread(ticker) {
    var bidPrices = _.sortBy(Object.keys(orderBook_Bid[ticker]), (num) => {
        return -num;
    });
    var askPrices = _.sortBy(Object.keys(orderBook_Ask[ticker]));

    if (bidPrices.length > 0 && askPrices.length > 0) {
        // var spreadDollars = orderBook_Ask[ticker][askPrices[0]] * -askPrices[0] - orderBook_Bid[ticker][bidPrices[0]] * bidPrices[0];
        // util.log(`Spread Dollars: ${spreadDollars}\n`)


        var spreadPrice = askPrices[0] - bidPrices[0];
        var spreadPercentage = spreadPrice / ((parseFloat(askPrices[0]) + parseFloat(bidPrices[0])) / 2);
        // util.log(`BidPrices: ${bidPrices}`)
        // util.log(`AskPrices: ${askPrices}`)
        // util.log(`Spread Price: ${spreadPrice}`)
        // util.log(`Spread Percentage: ${spreadPercentage}\n`)
        return spreadPercentage;
    }
    
}

// Calculates the aggregate demand/supply of all price points
function calculateDemandSupply(ticker) {
    // Ask
    var askSum = 0, bidSum = 0;
    for (i in orderBook_Ask[ticker]) {
        askSum += orderBook_Ask[ticker][i] * i;
    }
    
    for (i in orderBook_Bid[ticker]) {
        bidSum += orderBook_Bid[ticker][i] * i;
    }
    return {demand: bidSum, supply: askSum}
    
}

function syncOrderBook(ticker, price, count, amount) {
    orderBook_Ask[ticker] = orderBook_Ask[ticker] === undefined ? {} : orderBook_Ask[ticker];
    orderBook_Bid[ticker] = orderBook_Bid[ticker] === undefined ? {} : orderBook_Bid[ticker];
    // Add or update to book
    if (count > 0) {
        // Bid
        if (amount > 0) {
            orderBook_Bid[ticker][price] = amount * count;
        }
        // Ask
        else {
            amount = -amount;
            orderBook_Ask[ticker][price] = amount * count;
        }
    }
    // Delete from book
    else {
        // Bid
        if (amount > 0) {
            delete orderBook_Bid[ticker][price];
            // console.log('removing order from bid book')
        }
        // Ask
        else {
            delete orderBook_Ask[ticker][price];
            // console.log('removing order from ask book')
        }
    }
}

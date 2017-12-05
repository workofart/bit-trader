const tickers = require('./mapping'),
      util = require('util'),
      WebSocket = require('ws'),
      moment = require('moment'),
      _ = require('underscore');

/************ Custom Functions **********/
const indicators = require('./indicators'),
      utilities = require('./util'),
      db = require('./store'),
      executor = require('./executor'),
      automation = require('./automation');

const {
    INITIAL_INVESTMENT, MAX_SCORE_INTERVAL, IS_BUY_IMMEDIATELY, STOP_LOSS
} = require('./invest_constants');

global.wallet = 600;
global.currencyWallet = {};
global.latestPrice = {};
global.storedWeightedSignalScore = {};
/***************************************************/
const { invest } = require('./investment');

/**************** WebSocket Client (From Bitfinex) *****************/
const URL = 'http://127.0.0.1:3001/api/';
let connection;
/***************************************************/

/**************** WebSocket Server (to UI) *****************/
const connection_to_client = new WebSocket.Server({ host: '127.0.0.1', port: 1338 });
connection_to_client.on('request', (req) => {
    req.accept();
})

/***************************************************/

let indicatorFlags = {
    'ADX': true,
    'RSI': true,
    'DEMA_SMA_CROSS': true,
    'PSAR': true
}

/************** OrderBook Parameters **************/
const DEMAND_SUPPLY_SPREAD_MULTIPLIER = 1.1,
      DEMAND_SUPPLY_DISTANCE = 3, // Demand is N times Supply, vice versa
      SPREAD_THRESHOLD = 0.01, // 1% of bid/ask average, volatile if pass this threshold
      AGGREGATE_SUPPLY_DEMAND_BASE = 1; // the base score for this subsignal
/***************************************************/
console.log('=======================');
console.log('=                     =');
console.log('=  WE ARE LIVE BABY   =');
console.log('=                     =');
console.log('=======================');
// util.log('--------------- OrderBook Parameters --------------')
// util.log(`\nDEMAND_SUPPLY_SPREAD_MULTIPLIER: ${DEMAND_SUPPLY_SPREAD_MULTIPLIER}\nDEMAND_SUPPLY_DISTANCE: ${DEMAND_SUPPLY_DISTANCE}\nSPREAD_THRESHOLD: ${SPREAD_THRESHOLD}\nAGGREGATE_SUPPLY_DEMAND_BASE: ${AGGREGATE_SUPPLY_DEMAND_BASE}`)
/***************************************************/

// util.log('---------------- Investment Parameters --------------')
// util.log(`\nINITIAL_INVESTMENT: ${INITIAL_INVESTMENT}\nINVEST_PERCENTAGE: ${INVEST_PERCENTAGE}\nBUY_SIGNAL_TRIGGER: ${BUY_SIGNAL_TRIGGER}\nSELL_SIGNAL_TRIGGER: ${SELL_SIGNAL_TRIGGER}\nTRADING_FEE: ${TRADING_FEE}\nMIN_PROFIT_PERCENTAGE: ${MIN_PROFIT_PERCENTAGE}\nMAX_SCORE_INTERVAL: ${MAX_SCORE_INTERVAL}\n STOP_LOSS: ${STOP_LOSS}`)
let orderBook_Bid = [],
    orderBook_Ask = [],
    candles = {},
    tickerPrices = {},
    storedCounts = {},
    clientWS,
    isClientDead = true;

const isCandleEnabled = true,
      isTickerPriceEnabled = true,
      isOrderBookEnabled = true;

/************ Pre-Termination Summary ***********/
process.on('SIGINT', function () {
    console.log('Caught termination signal');

    utilities.printWalletStatus(INITIAL_INVESTMENT, global.wallet, global.currencyWallet, global.latestPrice);
    process.exit();
});

//#region 
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
//#endregion

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
    let msg_parsed = JSON.parse(msg);

    if (msg_parsed.hasOwnProperty('id')) {
        console.log('Received client [public_books]\'s id: ' + msg_parsed.id)
    }

    let ticker = msg_parsed.ticker;

    if (msg_parsed.hasOwnProperty('datasource')) {

        mainProcessor(ticker, msg_parsed);
    }
})

// setInterval(() => { automation.raceTheBook('ETHUSD', 'buy', orderBook_Ask, orderBook_Bid, '0.04') }, 3000)

/***************************************************/
/*              Main Processor                     */
/*  - collects intelligence from subprocessors     */
/*  - calculates final signal                      */
/*  - trigger buy/sell action                      */
/***************************************************/
let mainProcessor = (ticker, data) => {
    // Extract the symbol
    ticker = ticker.substr(-6);

    // Initialize the scores/counts for a given ticker
    global.storedWeightedSignalScore[ticker] = global.storedWeightedSignalScore[ticker] !== undefined ? global.storedWeightedSignalScore[ticker] : 0;
    MAX_SCORE_INTERVAL[ticker] = MAX_SCORE_INTERVAL[ticker] !== undefined ? MAX_SCORE_INTERVAL[ticker] : 40;
    storedCounts[ticker] = storedCounts[ticker] !== undefined ? storedCounts[ticker] : 0;


    // reset signal score and make decision
    // if (storedCounts[ticker] >= MAX_SCORE_INTERVAL[ticker]) {
    //     if (global.storedWeightedSignalScore[ticker] != 0 && global.storedWeightedSignalScore[ticker] != Infinity) {
    //         util.log('------------------------------------------------\n\n')
    //         util.log(`[${ticker} | Weighted Signal Score: ${global.storedWeightedSignalScore[ticker].toFixed(4)}\n`)

    //         invest(global.storedWeightedSignalScore[ticker], ticker)
    //     }
    //     global.storedWeightedSignalScore[ticker] = 0;
    //     storedCounts[ticker] = 0;
    //     MAX_SCORE_INTERVAL[ticker] = 90;
    // }
    // util.log(`MAX_SCORE_INTERVAL: ${MAX_SCORE_INTERVAL}`)

    // Order books
    if (data.datasource === 'book' && isOrderBookEnabled) {
        // console.log('Received order books: [' + ticker + ']')
        processOrderBook(ticker, data.data);
    }

    // Ticker Prices
    else if (data.datasource === 'ticker' && isTickerPriceEnabled) {
        // console.log('Received ticker price: [' + ticker + ']')

        let promise = processTickerPrice(ticker, data.data, global.storedWeightedSignalScore[ticker]);
        promise.then((value) => {
            // util.log(`processTickerPrice.then(value)=${value}`)
            global.storedWeightedSignalScore[ticker] = value;
            // util.log(`${ticker} count: ${storedCounts[ticker]}`)
                // util.log(`[${ticker} | Weighted Signal Score: ${value.toFixed(4)}\n`)
            if (storedCounts[ticker] >= MAX_SCORE_INTERVAL[ticker]) {
                // if (global.storedWeightedSignalScore[ticker] != 0 && global.storedWeightedSignalScore[ticker] != Infinity) {
                //     util.log('------------------------------------------------\n\n')
                //     util.log(`[${ticker} | Weighted Signal Score: ${global.storedWeightedSignalScore[ticker].toFixed(4)}\n`)
                //     invest(global.storedWeightedSignalScore[ticker], ticker)
                // }
                // reset the signal score and counts
                util.log(`Resetting signal score for [${ticker}]`);
                global.storedWeightedSignalScore[ticker] = 0;
                storedCounts[ticker] = 0;
                MAX_SCORE_INTERVAL[ticker] = 40;
            }
            // util.log(`[${ticker}] RSI: ${value}`)
            invest(global.storedWeightedSignalScore[ticker], ticker);
            storedCounts[ticker] += 1;
        }).catch((reason) => util.error(reason))
    }

    // Candles
    // else if (data.datasource === 'candles' && isCandleEnabled) {
    //     var candlePromise = processCandles(ticker, data.data);
    //     candlePromise.then((value) => {
    //         // Calculate the two indicators
    //         var subscore = value[0]
    //         var trend = value[1]
    //         // util.log(`Candle[${ticker} | subscore: ${subscore} | trend: ${trend}`)
    //         global.storedWeightedSignalScore[ticker] = subscore

    //         if (storedCounts[ticker] >= MAX_SCORE_INTERVAL[ticker]) {
                
    //             // reset the signal score and counts
    //             util.log(`Resetting signal score for [${ticker}]`)
    //             global.storedWeightedSignalScore[ticker] = 0;
    //             storedCounts[ticker] = 0;
    //             MAX_SCORE_INTERVAL[ticker] = 40;
    //         }

    //         // Trend Strength check - dynamically adjust data collection interval
    //         // util.log(`[${ticker}] trendStrength: ${trendStrength[ticker]}`)
    //         if (trendStrength[ticker] > 50) {
    //             MAX_SCORE_INTERVAL[ticker] = MAX_SCORE_INTERVAL[ticker] + 20
    //             util.log(`[${ticker}] Strong strength, extending signal collection period: ${MAX_SCORE_INTERVAL[ticker]}`)
    //         }
    //         invest(global.storedWeightedSignalScore[ticker], ticker)
    //         storedCounts[ticker] += 1;
    //     })

    // }

};

/***************************************************/
/*              Candle Functions                   */
/***************************************************/

let processCandles = (ticker, data) => {
    let timeStamp, open, close, high, low, volume;

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
        return new Promise((resolve) => {
            resolve([global.storedWeightedSignalScore[ticker],-1]);
        })
    }
    else {
        timeStamp = moment(data[0]).local().format('YYYY-MM-DD HH:mm:ss');
        open = data[1];
        close = data[2];
        high = data[3];
        low = data[4];
        volume = data[5];

        // var processedData = {
        //     'time' : timeStamp
        // }

        let processedData = {
            'time': timeStamp,
            'open': open,
            'close': close,
            'high': high,
            'low': low,
            'volume': volume,
            'ticker': ticker
        };

        // console.log(processedData)
        // console.log(_.sortedIndex(candles, processedData, 'time'))
        let existingItem = _.find(candles[ticker], (item) => {
            return item.time === processedData.time
        });
        if (existingItem === undefined) {

            if (!Array.isArray(candles[ticker])) {
                candles[ticker] = []
            }
            candles[ticker].splice(_.sortedIndex(candles[ticker], processedData, 'time'), 0, processedData)
            // console.log(candles)
        }
        // The latest data point might contain the same timestamp but a different price
        // Update the last item in the list with the current price
        else {
            let removedItem = candles[ticker].splice(_.sortedIndex(candles[ticker], processedData, 'time'), 1, processedData)
        }
        let close = _.map(candles[ticker], (item) => {
                return item.close;
            }),
            high = _.map(candles[ticker], (item) => {
                return item.high;
            }),
            low = _.map(candles[ticker], (item) => {
                return item.low;
            });

        return new Promise((resolve) => {
            indicators.calculatePSAR(high, low, close, global.storedWeightedSignalScore[ticker]).then((subscore) => {
                indicators.calculateADX(high, low, close, subscore).then((result) => {
                    resolve(result)
                })
            })
        })
    }
};

/***************************************************/
/*           Ticker Price Functions                */
/***************************************************/

let processTickerPrice = (ticker, data, subscore) => {
    // util.log(`[${ticker}] current score: ${subscore}`)
    let ticker = ticker,
        bid = data[0],
        bid_size = data[1],
        ask = data[2],
        ask_size = data[3],
        daily_change = data[4],
        daily_change_perc = data[5],
        last_price = data[6],
        volume = data[7],
        high = data[8],
        low = data[9];


    let processedData = {
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
        'low': low,
        'time': moment().local().format('YYYY-MM-DD HH:mm:ss')
    };

    // console.log(processedData)
    let existingItem = _.find(tickerPrices[ticker], (item) => {
        return item.time === processedData.time
    });
    if (existingItem === undefined) {

        if (!Array.isArray(tickerPrices[ticker])) {
            tickerPrices[ticker] = []
        }
        db.storeLivePrice(ticker, last_price, bid, bid_size, ask, ask_size, high, low, volume)
        if (clientWS !== undefined && !isClientDead) {
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
                'volume': volume,
                'time': moment().local().format('YYYY-MM-DD HH:mm:ss')
            }))
        }
        tickerPrices[ticker].splice(_.sortedIndex(tickerPrices[ticker], processedData, 'time'), 0, processedData)
    }

    let promise = computeIndicators(ticker, tickerPrices[ticker], subscore);

    // Store the latest price into storage for investment decisions
    // util.log(`${ticker} : ${JSON.stringify(tickerPrices[ticker][tickerPrices[ticker].length - 1])}`)
    global.latestPrice[ticker] = tickerPrices[ticker][tickerPrices[ticker].length - 1].last_price;
    return promise;
}


function computeIndicators(ticker, data, processScore) {
    // var subscore = 0;
    
    let close = _.map(data, (item) => {
        return item.last_price;
    });

    // util.log(`[${ticker}] InputScore: ${processScore}`)
    indicators.initIndicators(indicatorFlags);

    // console.log('[' + ticker + ']: ' + JSON.stringify(close));
    let promise = new Promise((resolve) => {
        indicators.calculateBB_RSI (close, 2).then((subscore) => {
            resolve(subscore);
        })
    });
    return promise;
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
    // processScore[ticker] += analyzeDemandSupply(ticker, DEMAND_SUPPLY_DISTANCE);
    // console.log('\n\nDemand: ' + demand)
    // console.log('Supply: ' + supply)
    // console.log('Price: {}', price)
    // console.log('Count: {}', count)
    // console.log('Amount: {}', amount)
    // if (processScore[ticker] != 0) {
    //     util.log(`[${ticker}] Demand/Supply score: ${processScore[ticker]}`)
    // }
    // return processScore[ticker];
}

// Analyzes aggregate demand/supply as well as the spread
function analyzeDemandSupply(ticker, threshold) {
    var subscore = 0;
    var { supply, demand } = calculateDemandSupply(ticker);
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
    return { demand: bidSum, supply: askSum }

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


exports.syncOrderBook = syncOrderBook;
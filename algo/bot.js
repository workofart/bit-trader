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
      automation = require('./automation'),
      tickerProcessor = require('./DataProcessors/ticker'),
      candleProcessor = require('./DataProcessors/candle');

const {
    INITIAL_INVESTMENT, MAX_SCORE_INTERVAL, IS_BUY_IMMEDIATELY, STOP_LOSS
} = require('./invest_constants');

global.wallet = INITIAL_INVESTMENT;
global.currencyWallet = {};
global.latestPrice = {};
global.storedWeightedSignalScore = {};
/***************************************************/


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
connection.setMaxListeners(15);


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
let mainProcessor = async (ticker, data) => {
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
        await tickerProcessor.processTickerPrice(ticker, data.data, global.storedWeightedSignalScore[ticker]);
    }

    // Candles
    // else if (data.datasource === 'candles' && isCandleEnabled) {
    //
        await candleProcessor.processCandles(ticker, data.data);
    // }

};

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
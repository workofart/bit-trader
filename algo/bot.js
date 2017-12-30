const WebSocket = require('ws'),
      util = require('util');

/************ Custom Functions **********/
const utilities = require('./custom_util'),
      db = require('./store'),
      executor = require('./executor'),
      tickerProcessor = require('./DataProcessors/ticker'),
      candleProcessor = require('./DataProcessors/candle'),
      orderBookProcessor = require('./DataProcessors/orderBook');

let {
    INITIAL_INVESTMENT, IS_BUY_IMMEDIATELY, STOP_LOSS
} = require('./constants').investment;

global.wallet = INITIAL_INVESTMENT;
global.currencyWallet = {};
global.latestPrice = {};
global.tickerPrices = {};
global.storedWeightedSignalScore = {};
global.isLive = true; // CAUTION, SETTING THIS TO TRUE WILL SUBMIT MARKET ORDERS $$$$$$
global.frozenTickers = {}; // these tickers are based on correlation with the currency wallet to improve diversification
/***************************************************/


/**************** WebSocket Client (From Bitfinex) *****************/
const URL = 'http://127.0.0.1:3001/api/';
let connection;
/***************************************************/

/**************** WebSocket Server (to UI) *****************/
const connection_to_client = new WebSocket.Server({ host: '127.0.0.1', port: 1338 });
connection_to_client.on('request', (req) => {
    req.accept();
});

/***************************************************/
util.log('=======================');
util.log('=                     =');
util.log(`=  Live = ${global.isLive}       =`);
util.log('=                     =');
util.log('=======================');

/***************************************************/
const isCandleEnabled = false,
      isTickerPriceEnabled = true,
      isOrderBookEnabled = false;

/************ Pre-Termination Summary ***********/
process.on('SIGINT', function () {
    util.log('Caught termination signal');

    utilities.printWalletStatus();
    process.exit();
});


connection = new WebSocket('ws://127.0.0.1:1337');
connection.on('open', () => {
    util.log('Client [bot] started, listening to WebSocket 127.0.0.1:1337');
    db.clearTable('bitfinex_transactions');
    db.clearTable('bitfinex_live_price');

    // clear the orderbooks to prevent stale prices from keeping the TOB
    orderBookProcessor.clearOrderBook();

});
connection.setMaxListeners(15);


connection.on('message', (msg) => {
    let parsedMsg = JSON.parse(msg);

    if (parsedMsg.hasOwnProperty('id')) {
        util.log('Received client [public_books]\'s id: ' + parsedMsg.id)
    }

    let ticker = parsedMsg.ticker;

    if (parsedMsg.hasOwnProperty('datasource')) {

        mainProcessor(ticker, parsedMsg);
    }
})

// setInterval(() => { automation.raceTheBook('ETHUSD', 'buy', orderBook_Ask, orderBook_Bid, '0.04') }, 3000)

if (global.isLive) {
    setInterval( async () => {
        let pos = await executor.getActivePositions();
        global.wallet = INITIAL_INVESTMENT;
        for (let item of JSON.parse(pos)) {
            let ticker = item.symbol.toUpperCase();
            global.currencyWallet[ticker] = global.currencyWallet[ticker] !== undefined ? global.currencyWallet[ticker] : {};
            global.currencyWallet[ticker].qty = global.currencyWallet[ticker].qty !== undefined ? global.currencyWallet[ticker].qty : 0;
            global.currencyWallet[ticker].price = global.currencyWallet[ticker].price !== undefined ? global.currencyWallet[ticker].price : 0;

            global.currencyWallet[ticker].qty = parseFloat(item.amount);
            global.currencyWallet[ticker].price= parseFloat(item.base);
            global.wallet -= item.amount * item.base;
        }
    }, 10000);
}


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
    initScoreCounts(ticker);

    // Order books
    if (data.datasource === 'book' && isOrderBookEnabled) {
        // console.log('Received order books: [' + ticker + ']')
        orderBookProcessor.processOrderBook(ticker, data.data);
    }

    // Ticker Prices
    else if (data.datasource === 'ticker' && isTickerPriceEnabled) {
        try {
            tickerProcessor.processTickerPrice(ticker, data.data);
        }
        catch(e) {
            console.error('There was a problem processing ticker prices: ' + e.stack);
        }
    }

    // Candles
    else if (data.datasource === 'candles' && isCandleEnabled) {
        try {
            candleProcessor.processCandles(ticker, data.data);
        }
        catch(e) {
            console.error('There was a problem processing candles: ' + e.stack);
        }
    }

};

const initScoreCounts = (ticker) => {
    global.storedWeightedSignalScore[ticker] = global.storedWeightedSignalScore[ticker] !== undefined ? global.storedWeightedSignalScore[ticker] : 0;
};
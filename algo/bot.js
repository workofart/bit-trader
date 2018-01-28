const WebSocket = require('ws'),
      util = require('util');

/************ Custom Functions **********/
const utilities = require('./custom_util'),
      db = require('./store'),
      executor = require('./executor'),
      CustomUtil = require('./custom_util'),
      Investment = require('./investment/investment'),
	  InvestmentUtils = require('./investment/investmentUtils'),
      tickerProcessor = require('./DataProcessors/ticker'),
      candleProcessor = require('./DataProcessors/candle'),
      orderBookProcessor = require('./DataProcessors/orderBook');

require('./init/init');


global.isLive = true; // CAUTION, SETTING THIS TO TRUE WILL SUBMIT MARKET ORDERS $$$$$$
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

if (global.isLive) {
    (async() => {
        await InvestmentUtils.syncCurrencyWallet();
        Object.keys(global.currencyWallet).forEach((ticker) => {
            if (global.currencyWallet[ticker].qty > 0) {
                global.currencyWallet[ticker].repeatedBuyPrice = global.currencyWallet[ticker].price * (1 - global.REPEATED_BUY_MARGIN);
                global.currencyWallet[ticker].bearSellPrice = global.currencyWallet[ticker].repeatedBuyPrice * (1 + global.TRADING_FEE + global.MIN_PROFIT_PERCENTAGE);
            }
        });

        CustomUtil.printWalletStatus();

    })();
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
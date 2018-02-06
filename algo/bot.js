const util = require('util'),
	  binance = require('node-binance-api'),
	  _ = require('underscore');

/************ Custom Functions **********/
const utilities = require('./custom_util'),
      db = require('./store'),
      CONFIGS = require('../config/creds_binance'),
      executor = require('./executor'),
      mapping = require('../websockets/mapping_binance'),
      CustomUtil = require('./custom_util'),
      Investment = require('./investment/investment'),
	  InvestmentUtils = require('./investment/investmentUtils'),
      tickerProcessor = require('./DataProcessors/ticker'),
      candleProcessor = require('./DataProcessors/candle'),
      orderBookProcessor = require('./DataProcessors/orderBook');

require('./init/init');


global.isLive = false; // CAUTION, SETTING THIS TO TRUE WILL SUBMIT MARKET ORDERS $$$$$$
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

db.clearTable('binance_transactions');
db.clearTable('binance_live_price');


if (global.isLive) {
    (async() => {
        await InvestmentUtils.syncCurrencyWallet();
        Object.keys(global.currencyWallet).forEach((ticker) => {
            if (global.currencyWallet[ticker].qty > 0) {
				global.currencyWallet[ticker].repeatedBuyPrice = 0;
				global.currencyWallet[ticker].bearSellPrice = 0;
					// global.currencyWallet[ticker].repeatedBuyPrice = global.currencyWallet[ticker].price * (1 - global.REPEATED_BUY_MARGIN);
                // global.currencyWallet[ticker].bearSellPrice = global.currencyWallet[ticker].repeatedBuyPrice * (1 + global.TRADING_FEE + global.MIN_PROFIT_PERCENTAGE );
            }
        });

        CustomUtil.printWalletStatus();

    })();
}

/********************* BINANCE WEBSOCKET *******************/
let pairs = _.map(mapping, (i) => i+'BTC');
let throttledPairs = {};

_.forEach(pairs, (i) => { throttledPairs[i] = _.throttle((msg)=> mainProcessor(i, msg), 10000)});

binance.options(CONFIGS);

// const throttled = _.throttle((candlesticks) => {
// 	let { e:eventType, E:eventTime, s:symbol, k:ticks } = candlesticks;
// 	let { o:open, h:high, l:low, c:close, v:volume, n:trades, i:interval, x:isFinal, q:quoteVolume, V:buyVolume, Q:quoteBuyVolume } = ticks;
// 	// console.log(symbol+" "+interval+" candlestick update");
//
// 	let msg = {
// 		high: high,
// 		low: low,
// 		last_price: close,
// 		volume: volume
// 	};
//
// 	mainProcessor(symbol, msg);
// }, 10000);

binance.websockets.candlesticks(pairs, "1m", (candlesticks) => {
	let { e:eventType, E:eventTime, s:symbol, k:ticks } = candlesticks;
	let { o:open, h:high, l:low, c:close, v:volume, n:trades, i:interval, x:isFinal, q:quoteVolume, V:buyVolume, Q:quoteBuyVolume } = ticks;
	// console.log(symbol+" "+interval+" candlestick update");

	let msg = {
		high: high,
		low: low,
		last_price: close,
		volume: volume
	};
	throttledPairs[symbol](msg);
});
/********************* END BINANCE WEBSOCKET *******************/


/***************************************************/
/*              Main Processor                     */
/*  - collects intelligence from subprocessors     */
/*  - calculates final signal                      */
/*  - trigger buy/sell action                      */
/***************************************************/
let mainProcessor = (ticker, data) => {
    // Initialize the scores/counts for a given ticker
    initScoreCounts(ticker);

    // Order books
    // if (data.datasource === 'book' && isOrderBookEnabled) {
    //     // console.log('Received order books: [' + ticker + ']')
    //     orderBookProcessor.processOrderBook(ticker, data);
    // }

    // Ticker Prices
    if (isTickerPriceEnabled) {
        try {
            tickerProcessor.processTickerPrice(ticker, data);
        }
        catch(e) {
            console.error('There was a problem processing ticker prices: ' + e.stack);
        }
    }

    // Candles
    // else if (data.datasource === 'candles' && isCandleEnabled) {
    //     try {
    //         candleProcessor.processCandles(ticker, data);
    //     }
    //     catch(e) {
    //         console.error('There was a problem processing candles: ' + e.stack);
    //     }
    // }

};

const initScoreCounts = (ticker) => {
    global.storedWeightedSignalScore[ticker] = global.storedWeightedSignalScore[ticker] !== undefined ? global.storedWeightedSignalScore[ticker] : 0;
};

module.exports = {
    mainProcessor: mainProcessor
}
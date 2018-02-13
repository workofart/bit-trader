const util = require('util'),
	  binance = require('node-binance-api'),
	  _ = require('underscore');

/************ Custom Functions **********/
const utilities = require('./custom_util'),
      db = require('./store'),
      CONFIGS = require('../config/creds_binance'),
      mapping = require('../websockets/mapping_binance'),
      CustomUtil = require('./custom_util'),
      Investment = require('./investment/investment'),
	  InvestmentUtils = require('./investment/investmentUtils'),
	  executor = require('./executorBinance'),
      tickerProcessor = require('./DataProcessors/ticker'),
      candleProcessor = require('./DataProcessors/candle'),
      orderBookProcessor = require('./DataProcessors/orderBook');

require('./init/init');


global.isLive = true; // CAUTION, SETTING THIS TO TRUE WILL SUBMIT MARKET ORDERS $$$$$$
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
db.clearTable('binance_wallet');


if (global.isLive) {
    (async() => {
        await InvestmentUtils.syncCurrencyWallet();
        Object.keys(global.currencyWallet).forEach((ticker) => {
            if (global.currencyWallet[ticker].qty > 0) {
				global.currencyWallet[ticker].repeatedBuyPrice = 0;
				global.currencyWallet[ticker].bearSellPrice = 0;
            }
        });

		let availableTickers = _.filter(Object.keys(global.currencyWallet), (ticker) => {
			return global.currencyWallet[ticker].qty > 0;
		});

		console.log('Holding coins: ' + availableTickers);

		for (let ticker of availableTickers) {
			let price = await executor.getHoldingPrice(ticker);
			global.currencyWallet[ticker].price = price;
		}

        CustomUtil.printWalletStatus();

    })();

    // Store wallet state after 20 seconds to get full price feeds
    setTimeout(() => {
    	db.storeWalletState();
	}, 20000)
}

/********************* BINANCE WEBSOCKET *******************/
let pairs = _.map(mapping, (i) => i+'BTC');
let throttledPairs = {};

_.forEach(pairs, (i) => { throttledPairs[i] = _.throttle((msg)=> mainProcessor(i, msg), 10000)});

binance.options(CONFIGS);

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


// The only time the user data (account balances) and order execution websockets will fire, is if you create or cancel an order, or an order gets filled or partially filled
function balance_update(data) {
	console.log("Currency Wallet Update");
	executor.getCurrentBalance();
	CustomUtil.printWalletStatus();
	db.storeWalletState();
}

function execution_update(data) {
	let { x:executionType, s:symbol, p:price, q:quantity, S:side, o:orderType, i:orderId, X:orderStatus } = data;
	if ( executionType == "NEW" ) {
		if ( orderStatus == "REJECTED" ) {
			console.log("Order Failed! Reason: "+data.r);
		}
		console.log(symbol+" "+side+" "+orderType+" ORDER #"+orderId+" ("+orderStatus+")");
		console.log("..price: "+price+", quantity: "+quantity);
		return;
	}
	//NEW, CANCELED, REPLACED, REJECTED, TRADE, EXPIRED
	console.log(symbol+"\t"+side+" "+executionType+" "+orderType+" ORDER #"+orderId);
}

binance.websockets.userData(balance_update, execution_update);

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
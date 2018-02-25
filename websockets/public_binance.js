const binance = require('node-binance-api'),
	  fs = require('fs'),
	  util = require('util'),
	  _ = require('underscore'),
	  executor = require('../algo/executorBinance'),
	  mapping = require('./mapping_binance'),
	  CONFIGS = require('../config/creds_binance'),
	  customUtil = require('../algo/custom_util');

binance.options(CONFIGS);

// binance.prices('BNBBTC', (error, ticker) => {
// 	console.log("Price of BNB: ", ticker.BNBBTC);
// });

// binance.prices((error, ticker) => {
// 	console.log("prices()", ticker);
// 	console.log("Price of BTC: ", ticker.BTCUSDT);
// });

// binance.balance((error, balances) => {
// 	console.log("balances()", balances);
// 	console.log("ETH balance: ", balances.ETH.available);
// });

// binance.websockets.depthCache(['BNBBTC'], (symbol, depth) => {
// 	let bids = binance.sortBids(depth.bids);
// 	let asks = binance.sortAsks(depth.asks);
// 	// console.log(symbol+" depth cache update");
// 	// console.log("bids", bids);
// 	// console.log("asks", asks);
// 	console.log("best bid: "+binance.first(bids));
// 	console.log("best ask: "+binance.first(asks));
// });


binance.exchangeInfo(function(error, data) {
	let minimums = [];
	for ( let obj of data.symbols ) {
		let filters = {pair: obj.symbol, minNotional:0.001,minimum_order_size:1,maxQty:10000000,stepSize:1,minPrice:0.00000001,maxPrice:100000};
		for ( let filter of obj.filters ) {
			if ( filter.filterType == "MIN_NOTIONAL" ) {
				filters.minNotional = filter.minNotional;
			} else if ( filter.filterType == "PRICE_FILTER" ) {
				filters.minPrice = filter.minPrice;
				filters.maxPrice = filter.maxPrice;
			} else if ( filter.filterType == "LOT_SIZE" ) {
				filters.minimum_order_size = filter.minQty;
				filters.maxQty = filter.maxQty;
				filters.stepSize = filter.stepSize;
			}
		}
		minimums.push(filters);
	}
	// console.log(minimums);
	fs.writeFile("minimums.json", JSON.stringify(minimums, null, 4), function(err){});
});


// The only time the user data (account balances) and order execution websockets will fire, is if you create or cancel an order, or an order gets filled or partially filled
function balance_update(data) {
	console.log("Currency Wallet Update");
	for ( let obj of data.B ) {
		let { a:asset, f:available, l:onOrder } = obj;
		if ( available == "0.00000000" ) continue;

		global.currencyWallet[asset].qty = available;
		customUtil.printWalletStatus();
	}
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

// binance.websockets.userData(balance_update, execution_update);

// executor.submitMarket('BNBBTC', 0.01, 'buy')

const getCurrentBalance = () => {
	return new Promise ((resolve) => {
		binance.balance((error, balances) => {
			Object.keys(balances).forEach((ticker) => {
				if (mapping.indexOf(ticker) !== -1) {
					console.log(`${ticker}: ${balances[ticker].available}`);
					// global.currencyWallet[ticker].qty = balances[ticker].available;
				}
			});
			resolve(1);
		})
	})
}

// getCurrentBalance();


// executor.getHoldingPrice('ADABTC');

// getCurrentBalance()

// const throlled = _.throttle((candlesticks) => {
// 	let { e:eventType, E:eventTime, s:symbol, k:ticks } = candlesticks;
// 	let { o:open, h:high, l:low, c:close, v:volume, n:trades, i:interval, x:isFinal, q:quoteVolume, V:buyVolume, Q:quoteBuyVolume } = ticks;
//
// 	util.log(symbol+" "+interval+" candlestick update");
// }, 5000);
//
// binance.websockets.candlesticks('BNBBTC', "1m", throlled);
//

//
// binance.websockets.chart("BNBBTC", "1m", (symbol, interval, chart) => {
// 	let tick = binance.last(chart);
// 	const last = chart[tick].close;
// 	// console.log(chart);
// 	// Optionally convert 'chart' object to array:
// 	// let ohlc = binance.ohlc(chart);
// 	// console.log(symbol, ohlc);
// 	console.log(symbol+" last price: "+last)
// });




// binance.historicalTrades("BNBBTC", (error, response)=>{
// 	console.log("aggTrades", response);
// });

// binance.recentTrades("BNBBTC", (error, response)=>{
// 	console.log("recentTrades", response);
// });
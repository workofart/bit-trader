const binance = require('node-binance-api'),
	  CONFIGS = require('../config/creds_binance');

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

/// / binance.websockets.trades(['BNBBTC'], (trades) => {
// 	let {e:eventType, E:eventTime, s:symbol, p:price, q:quantity, m:maker, a:tradeId} = trades;
// 	console.log(symbol+" trade update. price: "+price+", quantity: "+quantity+", maker: "+maker);
// });

// binance.websockets.candlesticks(['BNBBTC'], "1m", (candlesticks) => {
// 	let { e:eventType, E:eventTime, s:symbol, k:ticks } = candlesticks;
// 	let { o:open, h:high, l:low, c:close, v:volume, n:trades, i:interval, x:isFinal, q:quoteVolume, V:buyVolume, Q:quoteBuyVolume } = ticks;
// 	console.log(symbol+" "+interval+" candlestick update");
	// console.log("open: "+open);
	// console.log("high: "+high);
	// console.log("low: "+low);
	// console.log("close: "+close);
	// console.log("volume: "+volume);
	// console.log("isFinal: "+isFinal);
// });

binance.aggTrades("BNBBTC", {limit:500}, (error, response)=>{
	console.log("aggTrades", response);
});
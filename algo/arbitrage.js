const binance = require('node-binance-api'),
	_ = require('underscore'),
	CONFIGS = require('../config/creds_binance'),
	MIN_AMOUNT = require('./minOrderBinance'),
	db = require('./store'),
	executor = require('./executorBinance');

binance.options(CONFIGS);

db.clearTable('binance_transactions');

let latestPrice = {};
let bidAsk = {};
let currencyWallet = {};
let lastPair;
let running = false,
	checking = false;
// let wallet = 0.04;
// let INITIAL_INVESTMENT = 0.04;
let INITIAL_INVESTMENT;
const TRADING_FEE = 0.0003;
const MIN_PROFIT_PERCENTAGE = 0.00055;
// const MIN_PROFIT_PERCENTAGE = 0;

const getTopPairs = async () => {

	let bucket = {
		ETH: [],
		BTC: [],
		BNB: [],
		// USDT: []
	};
	return new Promise((resolve, reject) => {
		binance.prevDay(false, (error, prevDay) => {
			// console.log(prevDay); // view all data
			for ( let obj of prevDay ) {
				let symbol = obj.symbol;
				if (Object.keys(bucket).indexOf(symbol.substr(-3)) !== -1) {
					bucket[symbol.substr(-3)].push({pair: symbol, volume: obj.quoteVolume, priceChg: obj.priceChangePercent});
				}
			}
			for (let base in bucket) {
				bucket[base] = _.sortBy(bucket[base], (pair) => {
					return -parseFloat(pair.volume);
				})
			}
			resolve(bucket);
		});
	});
}

const createTradingBuckets = (bucket, limit = 100) => {
	for (let base in bucket) {
		bucket[base] = bucket[base].slice(5, limit+5);
	}

	let ETH = _.map(bucket['ETH'], (i) => i.pair.substr(0, i.pair.length - 3)),
		BTC = _.map(bucket['BTC'], (i) => i.pair.substr(0, i.pair.length - 3)),
		BNB = _.map(bucket['BNB'], (i) => i.pair.substr(0, i.pair.length - 3));

	let targetCoins = _.intersection(ETH, BTC, BNB);

	let tradingBucket = [['BNBBTC', 'BNBETH', 'ETHBTC']];

	bidAsk['BNBETH'] = {};
	bidAsk['BNBBTC'] = {};
	bidAsk['ETHBTC'] = {};
	for (let coin of targetCoins) {
		let group = [];

		for (let base of ['BTC', 'ETH']) {
			console.log(`${coin}${base}`);
			group.push(`${coin}${base}`);
			setupWallet(coin);
			bidAsk[coin+base] = {};
		}
		group.push('ETHBTC');
		setupWallet('ETH');
		setupWallet('BNB');
		setupWallet('BTC');
		currencyWallet['BTC'].qty = INITIAL_INVESTMENT;
		tradingBucket.push(group);
	}

	console.log(`-------------- [${tradingBucket.length}] TRADING BUCKETS CONSTRUCTED --------------`);
	return tradingBucket;
}

const setupWallet = (ticker) => {
	currencyWallet[ticker] = {};
	currencyWallet[ticker].qty = 0;
}

const getInitialBalance = () => {
	return new Promise ((resolve) => {
		binance.balance((error, balances) => {
			let totalValue = 0;
			Object.keys(currencyWallet).forEach((ticker) => {
				if (currencyWallet[ticker] !== undefined) {
					currencyWallet[ticker].qty = parseFloat(balances[ticker].available);
					if (ticker !== 'BTC') {
						totalValue += currencyWallet[ticker].qty * latestPrice[ticker+'BTC'];
					}
					else if (ticker === 'BTC'){
						totalValue += currencyWallet['BTC'].qty;
					}
				}
			});
			// currencyWallet['BTC'].qty = parseFloat(balances['BTC'].available);
			INITIAL_INVESTMENT = totalValue;
			console.log('Updated BTC balance: ' + totalValue);
			resolve(1);
		})
	})
}

const getCurrentBalance = () => {
	return new Promise((resolve) => {
		binance.balance((error, balances) => {
			Object.keys(currencyWallet).forEach((ticker) => {
				if (currencyWallet[ticker] !== undefined) {
					currencyWallet[ticker].qty = parseFloat(balances[ticker].available);
				}
			});
			resolve(1);
		})
	});
};

const printPostTransaction = () => {
	console.log(JSON.stringify(currencyWallet, null, 2));
}

const printProfit = () => {
	// printPostTransaction();

	let totalValue = 0;
	Object.keys(currencyWallet).forEach((ticker) => {
		if (currencyWallet[ticker] !== undefined) {
			if (ticker !== 'BTC' && _.contains(Object.keys(bidAsk), ticker + 'BTC')) {
				totalValue += currencyWallet[ticker].qty * (bidAsk[ticker+'BTC'].bid + bidAsk[ticker+'BTC'].ask) / 2;
			}
			else if (ticker === 'BTC'){
				totalValue += currencyWallet['BTC'].qty;
			}
		}
	});

	console.log(`Wallet: ${currencyWallet['BTC'].qty} BTC | Total Value: ${totalValue} | Profit: ${((totalValue - INITIAL_INVESTMENT) / 1 * 100).toFixed(4)}%`);
}

const roundAmount = (ticker, amount, price) => {
	let minQty = parseFloat(MIN_AMOUNT[ticker].minQty),
		minNotional = parseFloat(MIN_AMOUNT[ticker].minNotional),
		stepSize = parseFloat(MIN_AMOUNT[ticker].stepSize);

	// Set minimum order amount with minQty
	if ( amount < minQty ) amount = minQty;

	// Set minimum order amount with minNotional
	if ( price * amount < minNotional ) {
		amount = minNotional / price;
	}

	// Round to stepSize
	// amount = Math.floor(amount / stepSize) * stepSize;
	amount = binance.roundStep(amount, stepSize);
	return amount;

}

/**
 * BUY - BUY COIN (SELL BASE)
 * SELL - SELL COIN (BUY BASE)
 * @param base
 * @param coin
 * @param ticker
 * @param side
 */
const handleSubmitMarket = async (ticker, side, price, qtyBought) => {
	const coin = ticker.slice(0, ticker.length - 3),
		  base = ticker.slice(-3);


	if (side === 'buy') {
		let amount = (currencyWallet[base].qty * 0.97) / price;
		amount = roundAmount(ticker, amount, price);

		// currencyWallet[coin].qty += amount;
		// currencyWallet[base].qty -= amount * latestPrice[ticker];
		let { qtyBought, priceBought } = await executor.submitMarket(ticker, amount, 'buy');
		if (!CONFIGS.test) {
			let priceDiff = (priceBought - price) / price * 100;
			console.log(`Price discrepancy: ${priceDiff.toFixed(2)}%`)
		}
		amount = priceBought === -1 ? amount : qtyBought;
		price = priceBought === -1 ? price : priceBought;
		await Promise.all([
			db.storeTransactionToDB(ticker, price, amount, 1),
			// getCurrentBalance()
		]);
		currencyWallet[coin].qty += amount;
		currencyWallet[base].qty -= amount * price;
		return qtyBought;
	}
	else if (side === 'sell') {
		let amount;
		if (qtyBought) {
			amount = qtyBought;
		}
		else {
			amount = roundAmount(ticker, currencyWallet[coin].qty, price);
		}
		let { qtySold, priceSold } = await executor.submitMarket(ticker, amount, 'sell');
		if (!CONFIGS.test) {
			let priceDiff = (priceSold - price) / price * 100;
			console.log(`Price discrepancy: ${priceDiff.toFixed(2)}%`)
		}
		amount = priceSold === -1 ? amount : qtySold;
		price = priceSold === -1 ? price : priceSold;
		await Promise.all([
			db.storeTransactionToDB(ticker, price, amount, 0),
			// getCurrentBalance()
		])
		currencyWallet[coin].qty -= amount;
		currencyWallet[base].qty += amount * price;
		return amount;
	}
}

const checkOpportunity = async (symbol, bucket) => {
	if (checking) {
		return;
	}
	console.time('timer');
	let pair = _.find(bucket, (i) => i.indexOf(symbol) !== -1);

	checking = true;
	// console.log('Checking opportunity: ' + pair);

	if (lastPair !== pair) {
		let data = await executor.getBidAsk();

		for (let i in pair) {
			if (Object.keys(data).indexOf(pair[i]) === -1) {
				data = await executor.getBidAsk();
			}
			// latestPrice[pair[i]] = parseFloat(data[pair[i]]);
			bidAsk[pair[i]].bid = parseFloat(data[pair[i]].bid);
			bidAsk[pair[i]].ask = parseFloat(data[pair[i]].ask);
		}
		// pair[0] = [BTC/...] = [...BTC]
		// pair[1] = [ETH/...] = [...ETH]
		// pair[2] = [BTC/ETH] = [ETHBTC]

		// BUY pair[0] Sell pair[1] Sell pair[2]

		let combo1 = currencyWallet['BTC'].qty * (1 - TRADING_FEE) / bidAsk[pair[0]].ask * (bidAsk[pair[1]].bid * (1 - TRADING_FEE)) * (bidAsk[pair[2]].bid * (1 - TRADING_FEE));
		let combo2 = currencyWallet['BTC'].qty * (1 - TRADING_FEE) / bidAsk[pair[2]].ask / (bidAsk[pair[1]].ask * (1 + TRADING_FEE)) * (bidAsk[pair[0]].bid * (1 - TRADING_FEE));

		if (bidAsk[pair[0]].ask < bidAsk[pair[1]].bid * bidAsk[pair[2]].bid && combo1 > currencyWallet['BTC'].qty * (1 + MIN_PROFIT_PERCENTAGE)) {
			console.log(`${pair[0]}: ${bidAsk[pair[0]].ask}`);
			console.log(`${pair[1]}: ${bidAsk[pair[1]].bid}`);
			console.log(`${pair[2]}: ${bidAsk[pair[2]].bid}`);

			// Buy Pair[0], buy coin sell base
			console.log('Step 1')
			let qtyBought = await handleSubmitMarket(pair[0], 'buy', bidAsk[pair[0]].ask);

			// Sell Pair[1], sell coin buy base
			console.log('Step 2')
			await handleSubmitMarket(pair[1], 'sell', bidAsk[pair[1]].bid, qtyBought);

			// Sell Pair[2], sell coin buy base
			console.log('Step 3')
			await handleSubmitMarket(pair[2], 'sell', bidAsk[pair[2]].bid);

			printProfit();

			lastPair = pair;
		}
		else if (bidAsk[pair[0]].bid > bidAsk[pair[1]].ask * bidAsk[pair[2]].ask && combo2 > currencyWallet['BTC'].qty * (1 + MIN_PROFIT_PERCENTAGE)) {
			console.log(`${pair[0]}: ${bidAsk[pair[0]].bid}`);
			console.log(`${pair[1]}: ${bidAsk[pair[1]].ask}`);
			console.log(`${pair[2]}: ${bidAsk[pair[2]].ask}`);

			// Buy Pair[2], buy coin sell base
			console.log('Step 1')
			await handleSubmitMarket(pair[2], 'buy', bidAsk[pair[2]].ask);

			// Buy Pair[1], buy coin sell base
			console.log('Step 2')
			let qtyBought = await handleSubmitMarket(pair[1], 'buy', bidAsk[pair[1]].ask);

			// Sell Pair[0], sell coin buy base
			console.log('Step 3')
			await handleSubmitMarket(pair[0], 'sell', bidAsk[pair[0]].bid, qtyBought);

			printProfit();
			lastPair = pair;
		}
	}
	checking = false;
	// running = false;
	console.timeEnd('timer');
}

(async() => {
	let bucket = await getTopPairs();
	let tradingBucket = createTradingBuckets(bucket);
	let selectedPairs = _.uniq(_.flatten(tradingBucket));
	let prices = await executor.getPriceByTicker();
	let bidAskData = await executor.getBidAsk();

	for (let ticker of selectedPairs) {
		latestPrice[ticker] = parseFloat(prices[ticker]);
		bidAsk[ticker].bid = parseFloat(bidAskData[ticker].bid);
		bidAsk[ticker].ask = parseFloat(bidAskData[ticker].ask);
	}

	await getInitialBalance();
	// setInterval(() => {
	// 	if (running) {
	// 		return;
	// 	}
		// running = true
		// executor.getPriceByTicker().then((data) => {
		// 	for (let ticker of selectedPairs) {
		// 		latestPrice[ticker] = parseFloat(data[ticker]);
		// 	}
			// console.log(counter);

		// for (let bucket of tradingBucket) {
		// 	checkOpportunity(bucket);
		// }
		// running = false;
			// }
		// })
	// }, 10000);
	// const mainFunc = _.throttle((candlestickData)=> {
	// 	let tick = binance.last(candlestickData);
	// 	const symbol = candlestickData.s;
	// 	const close = candlestickData[tick].c;
	// 	latestPrice[symbol] = parseFloat(close);
	//
	// 	let pair = _.find(tradingBucket, (i) => i.indexOf(symbol) !== -1);
	// 	if (pair !== lastPair) {
	// 		checkOpportunity(symbol, tradingBucket);
	// 	}
	// }, 1000);

	binance.websockets.candlesticks(_.uniq(_.flatten(tradingBucket)), '1m', (candlestickData) => {
		// mainFunc(candlestickData);
		let tick = binance.last(candlestickData);
		const symbol = candlestickData.s;
		const close = candlestickData[tick].c;
		checkOpportunity(symbol, tradingBucket)
		.catch((e) => {
			console.log(e.stack);
		})
	});

	// The only time the user data (account balances) and order execution websockets will fire, is if you create or cancel an order, or an order gets filled or partially filled
	// function balance_update(data) {
	// 	console.log("Balance Update");
	// 	for ( let obj of data.B ) {
	// 		let { a:asset, f:available, l:onOrder } = obj;
	// 		if ( available == "0.00000000" ) continue;
	// 		if (currencyWallet[asset] === undefined) {
	// 			currencyWallet[asset] = {};
	// 		}
	// 		currencyWallet[asset].qty = parseFloat(available);
	// 		console.log(asset+"\tavailable: "+available+" ("+onOrder+" on order)");
	// 	}
	// }
	// function execution_update(data) {
	// 	let { x:executionType, s:symbol, p:price, q:quantity, S:side, o:orderType, i:orderId, X:orderStatus } = data;
	// 	if ( executionType == "NEW" ) {
	// 		if ( orderStatus == "REJECTED" ) {
	// 			console.log("Order Failed! Reason: "+data.r);
	// 		}
	// 		console.log(symbol+" "+side+" "+orderType+" ORDER #"+orderId+" ("+orderStatus+")");
	// 		console.log("..price: "+price+", quantity: "+quantity);
	// 		return;
	// 	}
	// 	//NEW, CANCELED, REPLACED, REJECTED, TRADE, EXPIRED
	// 	console.log(symbol+"\t"+side+" "+executionType+" "+orderType+" ORDER #"+orderId);
	// }
	// binance.websockets.userData(balance_update, execution_update);

})()

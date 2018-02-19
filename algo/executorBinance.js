/**
 * This file contains the execution functions that will call the Exchange APIs to perform different
 * order placements
 */
const binance = require('node-binance-api'),
	CONFIGS = require('../config/creds_binance'),
	mapping = require('../websockets/mapping_binance'),
	MIN_AMOUNT = require('./minOrderBinance'),
	moment = require('moment'),
	_ = require('underscore'),
	URL = 'http://127.0.0.1:3001/api/';

binance.options(CONFIGS);

// Perform a overall account summary first
const getAccountSummary = () => {
	binance.openOrders(false, (err, data) => {
		console.log('Total open orders: ' + data.length);
		console.log(data);

		// for (let i in data) {
		// 	let { id, symbol, price, side, remaining_amount } = data[i];
		// 	console.log(`[${symbol}] | ${id}: ${side} @ ${price} for ${remaining_amount}`);
		// }
		// console.log(`getActiveOrders: \n: ${JSON.stringify(data)}`);
	});
};

// Margin Trading N/A for Binance
// const getActivePositionsByTicker = async (ticker) => {
// 	return new Promise((resolve) => {
// 		binance.openOrders(ticker, (err, res, symbol) => {
// 			resolve(res);
// 		});
// 	})
// };

// const getActivePositions = async () => {
// 	return new Promise((resolve) => {
// 		binance.openOrders(false, (err, res) => {
// 			resolve(res);
// 		})
// 	})
// };

const getPriceByTicker = (symbol) => {
	return new Promise( (resolve)=> {
		binance.prices(symbol, (error, ticker) => {
			// console.log("Price of BNB: ", ticker.BNBBTC);
			resolve(ticker);
		});
	})

}

const getCurrentBalance = () => {
	return new Promise ((resolve) => {
		binance.balance((error, balances) => {
			Object.keys(balances).forEach((ticker) => {
				if (mapping.indexOf(ticker) !== -1) {
					global.currencyWallet[ticker+'BTC'].qty = parseFloat(balances[ticker].available);
					// global.currencyWallet[ticker+'BTC'].price = parseFloat(prices[ticker+'BTC']);
				}
				if (ticker === 'BTC') {
					global.wallet = parseFloat(balances[ticker].available);
				}
			});
			resolve(1);
		})
	})
}

const getOpenOrdersByTicker = async (ticker) => {
	return new Promise((resolve) => {
		binance.openOrders(ticker, (err, res, symbol) => {
			resolve(res);
		});
	})
};


// Market Order
const submitMarket = async (ticker, amount, side) => {
	const flags = {
		type: 'MARKET',
		newOrderRespType: 'FULL'
	};
	console.log('Submitting market order: ' + JSON.stringify({ticker: ticker, price: '0.1', amount: amount.toString(), side: side, type: 'market'}));
	return new Promise((resolve) => {
		if (side === 'buy') {
			binance.marketBuy(ticker, amount ,flags, (error, response) => {
				if (error) console.error(JSON.stringify(error));
				if (response.status === 'FILLED') {
					console.log("MARKET Buy Success");

					let filledPrice, filledQty = 0, totalValue = 0;

					_.forEach(response.fills, (fill) => {
						totalValue += parseFloat(fill.price) * parseFloat(fill.qty);
						filledQty += parseFloat(fill.qty);
					});

					filledPrice = totalValue / filledQty;

					resolve({
						priceBought: filledPrice,
						qtyBought: filledQty
					});
				}
			});
			CONFIGS.test && resolve({
				priceBought: -1,
				qtyBought: amount
			});
		}
		else if (side === 'sell') {
			binance.marketSell(ticker, amount ,flags, (error, response) => {
				if (error) console.error(JSON.stringify(error));
				if (response.status === 'FILLED') {
					console.log("MARKET Sell Success");
					let filledPrice, filledQty = 0, totalValue = 0;

					_.forEach(response.fills, (fill) => {
						totalValue += parseFloat(fill.price) * parseFloat(fill.qty);
						filledQty += parseFloat(fill.qty);
					});

					filledPrice = totalValue / filledQty;

					resolve({
						priceSold: filledPrice,
						qtySold: filledQty
					});
				}
			});
			CONFIGS.test && resolve({
				priceSold: -1,
				qtySold: amount
			});
		}
	});
}

const getDepth = async (ticker) => {
	return new Promise((resolve) => {
		binance.depth(ticker, (error, depth, symbol) => {
			resolve(depth);
		})
	});
}

const getRealPriceFromDepth = (depth, qty, side) => {
	let price;
	let max = 10; // Show 10 closest orders only

	// Get the weighted price for a given qty based on
	// the market depth for the ticker
	if (side === 'buy') {
		let asks = binance.sortAsks(depth.asks, max);
		price = getWeightedPriceFromDepth(asks, qty);
	}
	else if (side === 'sell') {
		let bids = binance.sortBids(depth.bids, max);
		price = getWeightedPriceFromDepth(bids, qty);
	}
	return price;
}

const getHoldingPrice = async (ticker) => {

	const MIN = _.find(MIN_AMOUNT, (item) => { return item.pair === ticker});

	const latestPriceReset = (entries) => {
		let targetIndex = 0,
			balance = 0;
		_.forEach(entries, (item) => {
			balance = item.isBuyer ? balance + parseFloat(item.qty ): balance - parseFloat(item.qty);
			// console.log(balance);
			if (balance <= parseFloat(MIN.minimum_order_size)) {
				targetIndex = _.sortedIndex(entries, item, 'time');
			}
		});
		return targetIndex;
	};

	const weightedPrice = (entries) => {
		let existingQty = 0,
			existingPrice = 0;
		_.forEach(entries, (item) => {
			item.qty = parseFloat(item.qty);
			item.price = parseFloat(item.price);

			existingPrice = (item.price * item.qty +  existingQty * existingPrice) / (item.qty + existingQty);
			existingQty = item.isBuyer ? existingQty + item.qty : existingQty - item.qty;
		});
		return {qty: existingQty, price: existingPrice};
	}

	return new Promise((resolve, reject) => {
		binance.trades(ticker, (error, res)=>{
			let sortedRes = _.sortBy(res, (item) => {
				return item.time;
			})
			// console.log(sortedRes);

			let index = latestPriceReset(sortedRes);

			// console.log(`Total: ${sortedRes.length} | Target: ${index}`);
			let remainingTrades = sortedRes.slice(index + 1);
			// console.log(_.map(remainingTrades, (i) => {return {price: i.price, qty: i.qty, isBuy: i.isBuyer} } ));
			let {price, qty} = weightedPrice(remainingTrades);
			// console.log(`[${ticker}] Price: ${price}`);
			resolve(price);
		});
	});
}


const getBidAsk = async () => {
	return new Promise((resolve) => {
		binance.bookTickers((error, ticker) => {
			// console.log("bookTickers()", ticker);
			resolve(ticker);
			// console.log("Price of BNB: ", ticker.BNBBTC);
		});
	})
}

/**
 *
 * @param obj:
 * bids: {
 * 		'0.00102670': 108.86,
  		'0.00102660': 172.94
 * }
 * OR
 * asks: {
 * 		'0.00102770': 659.1,
 * 		'0.00102780': 699.93
 * }
 * @param qty: qty for buying or selling
 */
function getWeightedPriceFromDepth (obj, qty) {
	let prices = _.map(Object.keys(obj), (i) => parseFloat(i));
	let qtys = _.map(obj, (i) => i);

	for (let pos in qtys) {
		qty -= qtys[pos];
		if (qty <= 0) {
			return prices[pos];
		}
	}
}

module.exports = {
	binance: binance,
	submitMarket: submitMarket,
	getAccountSummary: getAccountSummary,
	getOpenOrdersByTicker: getOpenOrdersByTicker,
	getCurrentBalance: getCurrentBalance,
	getHoldingPrice: getHoldingPrice,
	getPriceByTicker: getPriceByTicker,
	getBidAsk: getBidAsk,
	getRealPriceFromDepth: getRealPriceFromDepth,
	getDepth: getDepth
};
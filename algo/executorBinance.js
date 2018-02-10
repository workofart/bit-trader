/**
 * This file contains the execution functions that will call the Exchange APIs to perform different
 * order placements
 */
const binance = require('node-binance-api'),
	CONFIGS = require('../config/creds_binance'),
	mapping = require('../websockets/mapping_binance'),
	MIN_AMOUNT = require('./minOrder'),
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

const getCurrentBalance = () => {
	return new Promise ((resolve) => {
		binance.prices((error, prices) => {
			binance.balance((error, balances) => {
				Object.keys(balances).forEach((ticker) => {
					if (mapping.indexOf(ticker) !== -1) {
						global.currencyWallet[ticker+'BTC'].qty = parseFloat(balances[ticker].available);
						global.currencyWallet[ticker+'BTC'].price = parseFloat(prices[ticker+'BTC']);
					}
					if (ticker === 'BTC') {
						global.wallet = parseFloat(balances[ticker].available);
					}
				});
				resolve(1);
			})
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
	console.log('Submitting market order: ' + JSON.stringify({ticker: ticker, price: '0.1', amount: amount.toString(), side: side, type: 'market'}));
	return new Promise((resolve) => {
		if (side === 'buy') {
			binance.marketBuy(ticker, amount ,{type:'MARKET'}, (error, response) => {
				if (error) console.error(JSON.stringify(error));
				if (response.status === 'FILLED') {
					console.log("MARKET Buy Success");
					resolve(response);
				}
			});

		}
		else if (side === 'sell') {
			binance.marketSell(ticker, amount ,{type:'MARKET'}, (error, response) => {
				if (error) console.error(JSON.stringify(error));
				if (response.status === 'FILLED') {
					console.log("MARKET Sell Success");
					resolve(response);
				}
			});

		}
	});
}


module.exports = {
	submitMarket: submitMarket,
	getAccountSummary: getAccountSummary,
	getOpenOrdersByTicker: getOpenOrdersByTicker,
	getCurrentBalance: getCurrentBalance
};
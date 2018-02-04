/**
 * This file contains the execution functions that will call the Exchange APIs to perform different
 * order placements
 */
const binance = require('node-binance-api'),
	CONFIGS = require('../config/creds_binance');
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
	// userAPI.getActivePositions((data)=> {
	//     console.log(`getActivePositions: \n: ${JSON.stringify(data)}`);
	// });
	// userAPI.getLedgerEntries((data)=> {
	//     console.log(`getLedgerEntries: \n: ${JSON.stringify(data)}`);
	// });
	// userAPI.getMarginSummary((data)=> {
	//     console.log(`getMarginSummary: \n: ${JSON.stringify(data)}`);
	// });
	// userAPI.getTradingSummary((data)=> {
	//     console.log(`getTradingSummary: \n: ${JSON.stringify(data)}`);
	// });
	// userAPI.getWalletBalance((data)=> {
	//     console.log(`getWalletBalance: \n: ${JSON.stringify(data)}`);
	// });

};

const getActivePositionsByTicker = async (ticker) => {
	binance.openOrders(ticker, (err, res, symbol) => {
		console.log(res);
	});
};

const getActivePositions = async () => {
	return await userAPI.getActivePositions();
};

const getOpenOrdersByTicker = async (ticker) => {
	let res = await userAPI.getActiveOrders();
	return await _.find(JSON.parse(res), (item) => {
		return item.symbol === ticker;
	});
};

const getOrderById = async (id) => {
	return await userAPI.getOrderStatus(id);
};


// Limit Order
const submitLimit = async (ticker, price, amount, side) => {
	// Pre-order parameter sanity check
	let minAmount = _.find(MIN_AMOUNT, (item) => { return item.pair === ticker});
	// if (price < currentPrice && amount >= minAmount) {
	//     console.log('order verification success')
	// }
	// else {
	//     console.log('Please double-check parameters submitted')
	// }
	return await userAPI.postNewOrder({ticker: ticker, price: price, amount: amount, side: side, type: 'limit'});
}


// Market Order
const submitMarket = async (ticker, amount, side) => {
	console.log('Submitting market order: ' + JSON.stringify({ticker: ticker, price: '0.1', amount: amount.toString(), side: side, type: 'market'}));
	return await userAPI.postNewOrder({ticker: ticker, price: '0.1', amount: amount.toString(), side: side, type: 'market'})
}

const cancelOrderById = async (id) => {
	// let status = await _verifyOrderCancelled(res);
	// return status ? res : false;
	return await userAPI.cancelOrder(id);
};

async function _verifyOrderExecuted (data) {
	return !data.is_live && !data.is_cancelled && data.remaining_amount === '0.0';
}

async function _verifyOrderCancelled (data) {
	if (data.message === 'Order could not be cancelled.') {
		return false
	}
	return data.is_cancelled
}

const cancelPreviousSubmitNew = async (ticker, price, amount, side) => {
	let currentOrders = await getOpenOrdersByTicker(ticker);
	if (currentOrders) {
		let currentId = await currentOrders.id;
		let res = await cancelOrderById(currentId);
		let cancelStatus = await _verifyOrderCancelled(res);
		await console.log(cancelStatus);
		while (!cancelStatus) {
			cancelStatus =  _verifyOrderCancelled(res);
		}
	}
	return await submitLimit(ticker, price, amount, side);
}

// getAccountSummary();
// submitLimit('edousd', '6', '10', 'sell').then((res) => {
//     console.log(res);
// });

getActivePositionsByTicker('ETHBTC').then((data) => {
    console.log(data);
})


module.exports = {
	submitLimit : submitLimit,
	submitMarket: submitMarket,
	getAccountSummary: getAccountSummary,
	cancelOrderById: cancelOrderById,
	getOpenOrdersByTicker: getOpenOrdersByTicker,
	getActivePositionsByTicker: getActivePositionsByTicker,
	getActivePositions: getActivePositions,
	cancelPreviousSubmitNew, cancelPreviousSubmitNew,
	getOrderById: getOrderById
};
// orderStatus(4891872869);
// cancelOrderById(4871370783);
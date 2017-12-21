/**
 * This file contains the execution functions that will call the Exchange APIs to perform different
 * order placements
 */
const userAPI = require('../api/user_functions');
const URL = 'http://127.0.0.1:3001/api/';
const MIN_AMOUNT = require('./minOrder')
const _ = require('underscore');

 // Perform a overall account summary first
const getAccountSummary = () => {
    userAPI.getActiveOrders((data)=> {
        console.log('Total open orders: ' + data.length);
        
        for (var i in data) {
            let { id, symbol, price, side, remaining_amount } = data[i]
            console.log(`[${symbol}] | ${id}: ${side} @ ${price} for ${remaining_amount}`);
        }
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
    
}

const getActivePositionsByTicker = async (ticker) => {
    let res = await userAPI.getActivePositions();
    let orders = await _.find(JSON.parse(res), (item) => {
        return item.symbol === ticker;
    });
    return orders
}

const getActivePositions = async () => {
    return await userAPI.getActivePositions();
}

const getOpenOrdersByTicker = async (ticker) => {
    let res = await userAPI.getActiveOrders();
    let orders = await _.find(JSON.parse(res), (item) => {
        return item.symbol === ticker;
    })
    return orders;
}

const getOrderById = async (id) => {
    let res = await userAPI.getOrderStatus(id);
    return res;
}


 // Limit Order
const submitLimit = async (ticker, price, amount, side) => {
    // Pre-order parameter sanity check
    var minAmount = _.find(MIN_AMOUNT, (item) => { return item.pair === ticker});
    // if (price < currentPrice && amount >= minAmount) {
    //     console.log('order verification success')
    // }
    // else {
    //     console.log('Please double-check parameters submitted')
    // }
    let res = await userAPI.postNewOrder({ticker: ticker, price: price, amount: amount, side: side, type: 'limit'});
    return res;
}


 // Market Order
const submitMarket = async (ticker, amount, side) => {
    console.log('Submitting market order: ' + JSON.stringify({ticker: ticker, price: '0.1', amount: amount.toString(), side: side, type: 'market'}));
    let res = await userAPI.postNewOrder({ticker: ticker, price: '0.1', amount: amount.toString(), side: side, type: 'market'})
    return res;
}

const cancelOrderById = async (id) => {
    let res = await userAPI.cancelOrder(id);
    // let status = await _verifyOrderCancelled(res);
    // return status ? res : false;
    return res;
}

async function _verifyOrderExecuted (data) {
    if (!data.is_live && !data.is_cancelled && data.remaining_amount === '0.0') {
        return true;
    }
    else {
        return false;
    }
}

async function _verifyOrderCancelled (data) {
    if (data.message === 'Order could not be cancelled.') {
        return false
    }
    else if (data.is_cancelled) {
        return true
    }
    else {
        return false
    }
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
    let newOrder = await submitLimit(ticker, price, amount, side);
    return newOrder;
} 

// getAccountSummary();
// submitLimit('edousd', '6', '10', 'sell').then((res) => {
//     console.log(res);
// });

// getActivePositionsByTicker('dshusd').then((data) => {
//     console.log(data);
// })


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
}
// orderStatus(4891872869);
// cancelOrderById(4871370783);
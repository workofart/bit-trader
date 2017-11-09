/**
 * This file contains the execution functions that will call the Exchange APIs to perform different
 * order placements
 */
const userAPI = require('../api/user_functions');
const URL = 'http://127.0.0.1:3001/api/';
const MIN_AMOUNT = require('./minOrder')

 // Perform a overall account summary first
var getAccountSummary = () => {
    userAPI.getActiveOrders((data)=> {
        console.log(`getActiveOrders: \n: ${JSON.stringify(data)}`);
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

 // Limit Order
var submitLimit = (ticker, price, amount, side, type) => {
    // Pre-order parameter sanity check
    var minAmount = _.find(MIN_AMOUNT, (item) => { return item.pair === ticker});
    if (price < currentPrice && amount >= minAmount) {
        console.log('order verification success')
    }
    else {
        console.log('Please double-check parameters submitted')
    }

    userAPI.postNewOrder({ticker: ticker, price: price, amount: amount, side: side, type: 'limit'}, (res) => {
        console.log(res);
    })
    
}


 // Market Order
var submitMarket = () => {
    userAPI.postNewOrder({ticker: ticker, price: price, amount: amount, side: side, type: 'market'}, (res) => {
        console.log(res);
    })
}

var cancelOrder = (id) => {
    userAPI.cancelOrder(id, (res) => {
        if (_verifyOrderCancelled(res)) {
            console.log(true);
        }
        else {
            console.log(false);
        }
    })
}

var orderStatus = (id) => {
    userAPI.getOrderStatus(id, (res) => {
        console.log(_verifyOrderExecuted(res));
    })
}


function _verifyOrderExecuted (data) {
    if (!data.is_live && !data.is_cancelled && data.remaining_amount === '0.0') {
        return true;
    }
    else {
        return false;
    }
}

function _verifyOrderCancelled (data) {
    if (data.message === 'Order could not be cancelled.') {
        return false
    }
    return true
}


// getAccountSummary();
// submitLimit();
// orderStatus(4891872869);
cancelOrder(4871370783);
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
        console.log(`Total open orders: ${data.length}`);
        console.log(data);

        // for (let i in data) {
        // 	let { id, symbol, price, side, remaining_amount } = data[i];
        // 	console.log(`[${symbol}] | ${id}: ${side} @ ${price} for ${remaining_amount}`);
        // }
        // console.log(`getActiveOrders: \n: ${JSON.stringify(data)}`);
    });
};

// const getActivePositions = async () => {
// 	return new Promise((resolve) => {
// 		binance.openOrders(false, (err, res) => {
// 			resolve(res);
// 		})
// 	})
// };

const getCurrentBalance = () => new Promise((resolve) => {
    binance.balance((error, balances) => {
        if (error) console.log(JSON.stringify(error));
        Object.keys(balances).forEach((ticker) => {
            if (mapping.indexOf(ticker) !== -1) {
                global.currencyWallet[`${ticker}BTC`].qty = parseFloat(balances[ticker].available);
                // global.currencyWallet[ticker+'BTC'].price = parseFloat(prices[ticker+'BTC']);
            }
            if (ticker === 'BTC') {
                global.wallet = parseFloat(balances[ticker].available);
            }
            if (ticker === 'BNB') {
                global.currencyWallet.BNBBTC.qty = parseFloat(balances[ticker].available);
                binance.prices('BNBBTC', (error, ticker) => {
                    global.currencyWallet.BNBBTC.price = parseFloat(ticker.BNBBTC);
                });
            }
        });
        resolve(1);
    });
});

const getOpenOrdersByTicker = async ticker => new Promise((resolve) => {
    binance.openOrders(ticker, (err, res, symbol) => {
        resolve(res);
    });
});

const getLatestPrices = async () => new Promise((resolve) => {
    binance.prices((err, price) => {
        resolve(price);
    });
});


// Market Order
const submitMarket = async (ticker, amount, side) => {
    console.log(`Submitting market order: ${JSON.stringify({
        ticker, price: '0.1', amount: amount.toString(), side, type: 'market',
    })}`);
    const flags = {
        type: 'MARKET',
        newOrderRespType: 'FULL',
    };
    return new Promise((resolve) => {
        if (side === 'buy') {
            binance.marketBuy(ticker, amount, flags, (error, response) => {
                if (error) console.error(JSON.stringify(error));
                if (response.status === 'FILLED') {
                    console.log('MARKET Buy Success');
                    resolve(response);
                }
            });
        } else if (side === 'sell') {
            binance.marketSell(ticker, amount, flags, (error, response) => {
                if (error) console.error(JSON.stringify(error));
                if (response.status === 'FILLED') {
                    console.log('MARKET Sell Success');
                    resolve(response);
                }
            });
        }
    });
};

const getHoldingPrice = async (ticker) => {
    const MIN = _.find(MIN_AMOUNT, item => item.pair === ticker);

    const latestPriceReset = (entries) => {
        let targetIndex = 0,
            balance = 0;
        _.forEach(entries, (item) => {
            balance = item.isBuyer ? balance + parseFloat(item.qty) : balance - parseFloat(item.qty);
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

            existingPrice = (item.price * item.qty + existingQty * existingPrice) / (item.qty + existingQty);
            existingQty = item.isBuyer ? existingQty + item.qty : existingQty - item.qty;
        });
        return { qty: existingQty, price: existingPrice };
    };

    return new Promise((resolve, reject) => {
        binance.trades(ticker, (error, res) => {
            let sortedRes = _.sortBy(res, item => item.time);
            // console.log(sortedRes);
            sortedRes = sortedRes.slice(sortedRes.length - 10, sortedRes.length);

            const index = latestPriceReset(sortedRes);

            // console.log(`Total: ${sortedRes.length} | Target: ${index}`);
            const remainingTrades = sortedRes.slice(index + 1);
            // console.log(_.map(remainingTrades, (i) => {return {price: i.price, qty: i.qty, isBuy: i.isBuyer} } ));
            const { price, qty } = weightedPrice(remainingTrades);
            console.log(`[${ticker}] Price: ${price}`);
            resolve(price);
        });
    });
};


module.exports = {
    binance,
    submitMarket,
    getAccountSummary,
    getOpenOrdersByTicker,
    getCurrentBalance,
    getHoldingPrice,
    getLatestPrices,
};

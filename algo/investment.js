const MIN_AMOUNT = require('./minOrder'),
      utilities = require('./util'),
      util = require('util'),
      db = require('./store'),
      executor = require('./executor'),
    {
        INITIAL_INVESTMENT, INVEST_PERCENTAGE,
        MIN_PROFIT_PERCENTAGE, TRADING_FEE,
        BUY_SIGNAL_TRIGGER, SELL_SIGNAL_TRIGGER,
        STOP_LOSS
    }  = require('./invest_constants');

class Investment {


    /***************************************************/
    /*              Investment statics               */
    /***************************************************/
    static invest(score, ticker) {
        if ( global.latestPrice[ticker] !== undefined) {
            let price =  global.latestPrice[ticker],
                qty = INVEST_PERCENTAGE * INITIAL_INVESTMENT / price;

            Investment.setupCurrencyWallet();

            // BUY
            if (Investment.buyPositionCheck(ticker, qty, price, score)) {
                let minAmount = _.find(MIN_AMOUNT, (item) => { return item.pair === ticker.toLowerCase()}).minimum_order_size,
                    times = (qty / minAmount).toFixed(0);
                qty = minAmount * times;
                // Investment.submitMarketOrder(ticker, 'buy', qty);
                Investment.submitDummyOrder(ticker, 'buy', qty, price);

            }

            // SELL
            else if (Investment.sellPositionCheck(ticker, price, score)) {
                // Investment.submitMarketOrder(ticker, 'sell');
                Investment.submitDummyOrder(ticker, 'sell', qty, price);
            }
        }

    }

    // Checks the long position on hand and evaluate whether
    // it's logical to exit the position
    static sellPositionCheck(ticker, price, score) {
        return (Investment.sellSignalReq(score) || Investment.minProfitReq(price) || Investment.stopLossReq(ticker, price))
            && Investment.currencyBalanceReq(ticker);
    }


    // Checks the long position on hand and evaluate whether
    // it's logical to enter the position
    static buyPositionCheck(ticker, qty, price, score) {
        return (Investment.buySignalReq(score) && Investment.fiatBalanceReq(qty, price) && Investment.repeatedBuyReq(ticker, price))
    }

    static repeatedBuyReq (ticker, price) {
        let lastPrice =  global.currencyWallet[ticker].price;
        return lastPrice === 0 || price.toFixed(4) < lastPrice.toFixed(4) * 0.99
    }

    static stopLossReq (ticker, price) {
        let lastPrice =  global.currencyWallet[ticker].price;
        return price < lastPrice * (1 - STOP_LOSS)
    }

    static sellSignalReq (score) {
        return score <= SELL_SIGNAL_TRIGGER;
    }

    static buySignalReq (score) {
        return score >= BUY_SIGNAL_TRIGGER;
    }

    static fiatBalanceReq (qty, price) {
        return  global.wallet >= qty * price;
    }

    static currencyBalanceReq (ticker) {
        return  global.currencyWallet[ticker].qty > 0
    }

    static minProfitReq (ticker, price) {
        let lastPrice =  global.currencyWallet[ticker].price;
        return (price > lastPrice * (1 + MIN_PROFIT_PERCENTAGE + TRADING_FEE))
    }

    // calculate the weighted average price of all positions
    static weightedAvgPrice (ticker, price, qty) {
        return (price * qty +  global.currencyWallet[ticker].qty *  global.currencyWallet[ticker].price) / (qty +  global.currencyWallet[ticker].qty);
    }

    static submitDummyOrder (ticker, side, qty, price) {
        if (side === 'sell') {
            global.wallet +=  global.currencyWallet[ticker].qty * price * (1 - TRADING_FEE);
            util.log(`************ Sell | ${ global.currencyWallet[ticker].qty}`);
            // db.storeTransactionToDB(ticker, price,  global.currencyWallet[ticker].qty, 0);
            global.currencyWallet[ticker].qty = 0; // clear qty after sold, assuming always sell the same qty
            global.currencyWallet[ticker].price = 0; // clear the price after sold
            global.storedWeightedSignalScore[ticker] = 0; // clear score
            utilities.printWalletStatus(INITIAL_INVESTMENT,  global.wallet,  global.currencyWallet,  global.latestPrice);
        }
        else if (side === 'buy') {
            global.wallet -= qty * price * (1 + TRADING_FEE);
            global.currencyWallet[ticker].price = Investment.weightedAvgPrice(ticker, price, qty);
            global.currencyWallet[ticker].qty += qty;
            util.log(`************* Buy | ${qty} ${ticker} @ ${price} *************`);
            utilities.printWalletStatus(INITIAL_INVESTMENT,  global.wallet,  global.currencyWallet,  global.latestPrice);
            // db.storeTransactionToDB(ticker, price, qty, 1);
            global.storedWeightedSignalScore[ticker] = 0; // clear score
        }
    }

    static submitMarketOrder (ticker, side, qty) {
        if (side === 'sell') {

            executor.submitMarket(ticker,  global.currencyWallet[ticker].qty, side).then((res) => {
                res = JSON.parse(res);
                let executedPrice = parseFloat(res.price);
                delete res.is_cancelled;
                delete res.exchange;
                delete res.was_forced;
                delete res.is_live;
                delete res.is_hidden;

                global.wallet +=  global.currencyWallet[ticker].qty * executedPrice * (1 - TRADING_FEE);
                // util.log(`************ Sell | ${ global.currencyWallet[ticker].qty
                util.log(`\n****************************************************`);
                util.log(res);
                util.log(`****************************************************\n`);
                db.storeTransactionToDB(ticker, executedPrice,  global.currencyWallet[ticker].qty, 0);
                global.currencyWallet[ticker].qty = 0; // clear qty after sold, assuming always sell the same qty
                global.currencyWallet[ticker].price = 0; // clear the price after sold
                storedWeightedSignalScore[ticker] = 0; // clear score
                utilities.printWalletStatus(INITIAL_INVESTMENT,  global.wallet,  global.currencyWallet,  global.latestPrice);
            }).catch((reason) => {
                util.error('!!!!!!!!!!!!!!!! Market Order Error !!!!!!!!!!!!!!!!');
                util.error(reason);
                util.error('!!!!!!!!!!!!!!!! Market Order Error !!!!!!!!!!!!!!!!')
            })
        }
        else if (side === 'buy') {
            executor.submitMarket(ticker, qty, side).then((res) => {
                res = JSON.parse(res);
                let executedPrice = parseFloat(res.price);
                delete res.is_cancelled;
                delete res.exchange;
                delete res.was_forced;
                delete res.is_live;
                delete res.is_hidden;
                util.log('executedPrice: ' + executedPrice);

                global.wallet -= qty * executedPrice * (1 + TRADING_FEE);
                global.currencyWallet[ticker].price = Investment.weightedAvgPrice(ticker, executedPrice, qty);
                global.currencyWallet[ticker].qty += qty;

                // util.log(`************* Buy | ${qty} ${ticker} @ ${price} *************`)
                util.log(`\n****************************************************`);
                util.log(res);
                util.log(`****************************************************\n`);
                utilities.printWalletStatus(INITIAL_INVESTMENT,  global.wallet,  global.currencyWallet,  global.latestPrice);
                db.storeTransactionToDB(ticker, executedPrice, qty, 1);
                global.storedWeightedSignalScore[ticker] = 0; // clear score
            }).catch((reason) => {
                util.error('!!!!!!!!!!!!!!!! Market Order Error !!!!!!!!!!!!!!!!');
                util.error(reason);
                util.error('!!!!!!!!!!!!!!!! Market Order Error !!!!!!!!!!!!!!!!');
            })
        }
    }

    static setupCurrencyWallet() {
        global.currencyWallet[ticker] =  global.currencyWallet[ticker] !== undefined ?  global.currencyWallet[ticker] : {};
        global.currencyWallet[ticker].qty =  global.currencyWallet[ticker].qty !== undefined ?  global.currencyWallet[ticker].qty : 0;
        global.currencyWallet[ticker].price =  global.currencyWallet[ticker].price !== undefined ?  global.currencyWallet[ticker].price : 0;
    }
}

module.exports = Investment;
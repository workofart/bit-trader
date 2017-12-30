const MIN_AMOUNT = require('./minOrder'),
      util = require('util'),
      customUtil = require('./custom_util'),
      db = require('./store'),
      _ = require('underscore'),
      executor = require('./executor'),
    {
        INITIAL_INVESTMENT, INVEST_PERCENTAGE,
        MIN_PROFIT_PERCENTAGE, TRADING_FEE,
        BUY_SIGNAL_TRIGGER, SELL_SIGNAL_TRIGGER,
        STOP_LOSS, REPEATED_BUY_MARGIN
    }  = require('./constants').investment;

class Investment {


    /***************************************************/
    /*              Investment statics               */
    /***************************************************/
    static invest(score, ticker) {
        if (global.latestPrice[ticker] !== undefined) {
            let price =  global.latestPrice[ticker],
                qty = INVEST_PERCENTAGE * INITIAL_INVESTMENT / price;

            Investment.setupCurrencyWallet(ticker);

            // BUY
            if (Investment.buyPositionCheck(ticker, qty, price, score)) {
                let minAmount = _.find(MIN_AMOUNT, (item) => { return item.pair === ticker.toLowerCase()}).minimum_order_size,
                    times = (qty / minAmount).toFixed(0);
                qty = minAmount * times;
                if (global.isLive) {
                    Investment.submitMarketOrder(ticker, 'buy', qty);
                }
                else {
                    Investment.submitDummyOrder(ticker, 'buy', qty, price);
                }
            }

            // SELL
            else if (Investment.sellPositionCheck(ticker, price, score)) {
                if (global.isLive) {
                    Investment.submitMarketOrder(ticker, 'sell');
                }
                else {
                    Investment.submitDummyOrder(ticker, 'sell', qty, price);
                }
            }
        }
        // Reset the frozen tickers
        // global.frozenTickers = {};
    }

    // Checks the long position on hand and evaluate whether
    // it's logical to exit the position
    static sellPositionCheck(ticker, price, score) {
        return (Investment.minProfitReq(ticker, price) || Investment.stopLossReq(ticker, price))
            && Investment.currencyBalanceReq(ticker) && Investment.sellSignalReq(score);
    }


    // Checks the long position on hand and evaluate whether
    // it's logical to enter the position
    static buyPositionCheck(ticker, qty, price, score) {
        return (Investment.buySignalReq(score) &&
            Investment.fiatBalanceReq(qty, price) &&
            Investment.repeatedBuyReq(ticker, price) &&
            !Investment.frozenTickerReq(ticker))
    }

    static frozenTickerReq(ticker) {
        if(global.frozenTickers[ticker]) {
            // util.log('Avoided buying ' + ticker);
        }
        return global.frozenTickers[ticker] === true;
    }

    static repeatedBuyReq (ticker, price) {
        let lastPrice =  global.currencyWallet[ticker].price;
        return lastPrice === 0 || price.toFixed(4) < lastPrice.toFixed(4) * (1 - REPEATED_BUY_MARGIN);
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
            customUtil.printSell(ticker, price);
            db.storeTransactionToDB(ticker, price,  global.currencyWallet[ticker].qty, 0);
            global.currencyWallet[ticker].qty = 0; // clear qty after sold, assuming always sell the same qty
            global.currencyWallet[ticker].price = 0; // clear the price after sold
            global.storedWeightedSignalScore[ticker] = 0; // clear score
            // customUtil.printWalletStatus();
            // customUtil.printPNL();
        }
        else if (side === 'buy') {
            global.wallet -= qty * price * (1 + TRADING_FEE);
            global.currencyWallet[ticker].price = Investment.weightedAvgPrice(ticker, price, qty);
            global.currencyWallet[ticker].qty += qty;
            customUtil.printBuy(ticker, qty, price);
            // customUtil.printWalletStatus();
            // customUtil.printPNL();
            db.storeTransactionToDB(ticker, price, qty, 1);
            global.storedWeightedSignalScore[ticker] = 0; // clear score
        }
    }

    static async submitMarketOrder (ticker, side, qty) {
        if (side === 'sell') {

            try {
                let res = await executor.submitMarket(ticker,  global.currencyWallet[ticker].qty, side);
                res = JSON.parse(res);
                let executedPrice = parseFloat(res.price);
                delete res.is_cancelled;
                delete res.exchange;
                delete res.was_forced;
                delete res.is_live;
                delete res.is_hidden;

                global.wallet +=  global.currencyWallet[ticker].qty * executedPrice * (1 - TRADING_FEE);
                customUtil.printSell(ticker, executedPrice);
                util.log(`\n****************************************************`);
                util.log(res);
                util.log(`****************************************************\n`);
                db.storeTransactionToDB(ticker, executedPrice,  global.currencyWallet[ticker].qty, 0);
                global.currencyWallet[ticker].qty = 0; // clear qty after sold, assuming always sell the same qty
                global.currencyWallet[ticker].price = 0; // clear the price after sold
                storedWeightedSignalScore[ticker] = 0; // clear score
                customUtil.printWalletStatus(INITIAL_INVESTMENT,  global.wallet,  global.currencyWallet,  global.latestPrice);
            }
            catch(e) {
                util.error('!!!!!!!!!!!!!!!! Market Order Error !!!!!!!!!!!!!!!!');
                util.error(e.stack);
            }
        }
        else if (side === 'buy') {
            try {
                let res = await executor.submitMarket(ticker, qty, side);
                res = JSON.parse(res);
                let executedPrice = parseFloat(res.price);
                delete res.is_cancelled;
                delete res.exchange;
                delete res.was_forced;
                delete res.is_live;
                delete res.is_hidden;
                // util.log('executedPrice: ' + executedPrice);

                global.wallet -= qty * executedPrice * (1 + TRADING_FEE);
                global.currencyWallet[ticker].price = Investment.weightedAvgPrice(ticker, executedPrice, qty);
                global.currencyWallet[ticker].qty += qty;

                customUtil.printBuy(ticker, qty, executedPrice);
                util.log(`\n****************************************************`);
                util.log(res);
                util.log(`****************************************************\n`);
                customUtil.printWalletStatus(INITIAL_INVESTMENT,  global.wallet,  global.currencyWallet,  global.latestPrice);
                db.storeTransactionToDB(ticker, executedPrice, qty, 1);
                global.storedWeightedSignalScore[ticker] = 0; // clear score
            }
            catch(e) {
                util.error('!!!!!!!!!!!!!!!! Market Order Error !!!!!!!!!!!!!!!!');
                util.error(e.stack);
            }
        }
    }

    static setupCurrencyWallet(ticker) {
        global.currencyWallet[ticker] =  global.currencyWallet[ticker] !== undefined ?  global.currencyWallet[ticker] : {};
        global.currencyWallet[ticker].qty =  global.currencyWallet[ticker].qty !== undefined ?  global.currencyWallet[ticker].qty : 0;
        global.currencyWallet[ticker].price =  global.currencyWallet[ticker].price !== undefined ?  global.currencyWallet[ticker].price : 0;
    }
}

module.exports = Investment;
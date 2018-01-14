const MIN_AMOUNT = require('./minOrder'),
      util = require('util'),
      customUtil = require('./custom_util'),
      db = require('./store'),
      _ = require('underscore'),
      executor = require('./executor');

class Investment {


    /***************************************************/
    /*              Investment statics               */
    /***************************************************/
    static invest(score, ticker, data) {
        if (global.latestPrice[ticker] !== undefined) {
            let price =  global.latestPrice[ticker],
                timestamp = data.timestamp,
                qty = global.INVEST_PERCENTAGE * global.INITIAL_INVESTMENT / price;


            Investment.setupCurrencyWallet(ticker);

            let minAmount = _.find(MIN_AMOUNT, (item) => { return item.pair === ticker.toLowerCase()}).minimum_order_size,
                times = (qty / minAmount).toFixed(0);
            qty = parseFloat((minAmount * times).toFixed(2));

            // BUY
            if (Investment.buyPositionCheck(ticker, qty, price, score)) {
                if (global.isLive) {
                    Investment.submitMarketOrder(ticker, 'buy', qty);
                }
                else {
                    Investment.submitDummyOrder(ticker, 'buy', qty, price, timestamp);
                }
            }

            // SELL
            else if (Investment.sellPositionCheck(ticker, price, score)) {
                if (global.isLive) {
                    Investment.submitMarketOrder(ticker, 'sell');
                }
                else {
                    Investment.submitDummyOrder(ticker, 'sell', qty, price, timestamp);
                }
            }

            // Downward Market SELL
            else if (Investment.bearSellPositionCheck(ticker, price, score)) {
                let sellQty = global.currencyWallet[ticker].qty * global.BEAR_SELL_PERCENTAGE;

                times = (sellQty / minAmount).toFixed(0);
                sellQty = parseFloat((minAmount * times).toFixed(2));

                sellQty = sellQty >= global.currencyWallet[ticker].qty ? 0 : sellQty;

                if (global.isLive && sellQty !== 0) {
                    Investment.submitMarketOrder(ticker, 'bearSell', sellQty);
                }
                else if (sellQty !== 0) {
                    Investment.submitDummyOrder(ticker, 'bearSell', sellQty, price, timestamp);
                }
            }
        }
    }

    // Checks the long position on hand and evaluate whether
    // it's logical to exit the position
    static sellPositionCheck(ticker, price, score) {
        return (Investment.minProfitReq(ticker, price) || Investment.stopLossReq(ticker, price))
            && Investment.currencyBalanceReq(ticker);
    }

    static bearSellPositionCheck(ticker, price, score) {
        return (
            Investment.currencyBalanceReq(ticker) && Investment.sellSignalReq(score) &&
            Investment.bearMarketReq(ticker) && Investment.repeatedSellReq(ticker, price)
        )
    }

    // Checks the long position on hand and evaluate whether
    // it's logical to enter the position
    static buyPositionCheck(ticker, qty, price, score) {
        return (
            (Investment.buySignalReq(score) &&
                Investment.fiatBalanceReq(qty, price) &&
                Investment.repeatedBuyReq(ticker, price) &&
                !Investment.frozenTickerReq(ticker)
            ) ||
            (Investment.extremeBuySignalReq(score) &&
                !Investment.frozenTickerReq(ticker) &&
                Investment.fiatBalanceReq(qty, price)
            )
        )
    }

    static frozenTickerReq(ticker) {
        if(global.frozenTickers[ticker]) {
            !global.isBacktest && util.log('Avoided buying ' + ticker);
        }
        return global.frozenTickers[ticker] === true;
    }

    static extremeBuySignalReq (score) {
        return score > global.BUY_SIGNAL_TRIGGER;
    }

    static repeatedSellReq (ticker, price) {
        let lastPrice = global.currencyWallet[ticker].bearSellPrice;
        return lastPrice === undefined || lastPrice === 0 || price > lastPrice;
    }

    static repeatedBuyReq (ticker, price) {
        let lastPrice =  global.currencyWallet[ticker].repeatedBuyPrice;
        return lastPrice === undefined || lastPrice === 0 || price < lastPrice;
    }

    static bearMarketReq (ticker) {
        return global.currencyWallet[ticker].price * (1 - global.BEAR_LOSS_START) > global.latestPrice[ticker];
    }

    static stopLossReq (ticker, price) {
        let lastPrice =  global.currencyWallet[ticker].price;
        return price < lastPrice * (1 - global.STOP_LOSS)
    }

    static sellSignalReq (score) {
        return score <= global.SELL_SIGNAL_TRIGGER;
    }

    static buySignalReq (score) {
        return score >= global.BUY_SIGNAL_TRIGGER;
    }

    static fiatBalanceReq (qty, price) {
        return  global.wallet >= qty * price;
    }

    static currencyBalanceReq (ticker) {
        return  global.currencyWallet[ticker].qty > 0
    }

    static minProfitReq (ticker, price) {
        let lastPrice =  global.currencyWallet[ticker].price;
        return (price > lastPrice * (1 + global.MIN_PROFIT_PERCENTAGE + global.TRADING_FEE))
    }

    // calculate the weighted average price of all positions
    static weightedAvgPrice (ticker, price, qty) {
        return (price * qty +  global.currencyWallet[ticker].qty *  global.currencyWallet[ticker].price) / (qty + global.currencyWallet[ticker].qty);
    }

    // if a bear sell occurred, then raise the repeatedBuy to profit % of bear sell
    // Simulating a subposition short sell
    static updateRepeatedBuyPrice (ticker, price) {
        global.currencyWallet[ticker].repeatedBuyPrice = price * (1 - global.TRADING_FEE - global.MIN_PROFIT_PERCENTAGE);
    }

    // if a repeated buy occurred, then lower the repeatedSell to profit % of repeated buy
    // Simulating a subposition long buy
    static updateBearSellPrice (ticker, price) {
        global.currencyWallet[ticker].bearSellPrice = price * (1 + global.TRADING_FEE + global.MIN_PROFIT_PERCENTAGE);
    }

    static submitDummyOrder (ticker, side, qty, price, timestamp) {
        if (side === 'sell') {
            global.wallet +=  global.currencyWallet[ticker].qty * price * (1 - global.TRADING_FEE);
            customUtil.printSell(ticker, price);
            db.storeTransactionToDB(ticker, price,  global.currencyWallet[ticker].qty, 0, timestamp);
            global.currencyWallet[ticker].qty = 0; // clear qty after sold, assuming always sell the same qty
            this.postSellTradeCleanup(ticker);
            customUtil.printWalletStatus();
            customUtil.printPNL();
        }
        else if (side === 'buy') {
            if (global.currencyWallet[ticker].repeatedBuyPrice > 0) {
                Investment.updateBearSellPrice(ticker, price);
            }

            global.wallet -= qty * price * (1 + global.TRADING_FEE);
            global.currencyWallet[ticker].price = Investment.weightedAvgPrice(ticker, price, qty);
            global.currencyWallet[ticker].repeatedBuyPrice = price * (1 - global.REPEATED_BUY_MARGIN); // record last buy price * (1-repeatedBuyPercentage)
            global.currencyWallet[ticker].qty += qty;
            customUtil.printBuy(ticker, qty, price);
            customUtil.printWalletStatus();
            customUtil.printPNL();
            !global.isParamTune && db.storeTransactionToDB(ticker, price, qty, 1, timestamp);
            global.storedWeightedSignalScore[ticker] = 0; // clear score
        }
        else if (side === 'bearSell') {
            global.wallet += qty * price * (1 - global.TRADING_FEE);
            customUtil.printBearSell(ticker, qty, price);
            db.storeTransactionToDB(ticker, price, qty, 0, timestamp);
            let tempPrice = Investment.weightedAvgPrice(ticker, price, -qty);
            Investment.updateRepeatedBuyPrice(ticker, price);
            global.currencyWallet[ticker].price = tempPrice !== null ? tempPrice : 0;
            global.currencyWallet[ticker].qty -= qty;
            global.currencyWallet[ticker].bearSellPrice = price;
            customUtil.printWalletStatus();
            customUtil.printPNL();
            global.storedWeightedSignalScore[ticker] = 0; // clear score
        }
    }

    static async submitMarketOrder (ticker, side, qty) {
        if (side === 'sell' && Investment.currencyBalanceReq(ticker)) {
            try {
                let prevQty = global.currencyWallet[ticker].qty;
                global.currencyWallet[ticker].qty = 0; // clear qty after sold, assuming always sell the same qty
                let res = await executor.submitMarket(ticker, prevQty, side);
                res = JSON.parse(res);
                let executedPrice = parseFloat(res.price);
                delete res.is_cancelled;
                delete res.exchange;
                delete res.was_forced;
                delete res.is_live;
                delete res.is_hidden;

                global.wallet +=  prevQty * executedPrice * (1 - global.TRADING_FEE);
                customUtil.printSell(ticker, executedPrice);
                util.log(`\n****************************************************`);
                util.log(res);
                util.log(`****************************************************\n`);
                db.storeTransactionToDB(ticker, executedPrice, prevQty, 0);
                this.postSellTradeCleanup(ticker);
                await Investment.syncCurrencyWallet();
                customUtil.printWalletStatus();
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
                if (global.currencyWallet[ticker].repeatedBuyPrice > 0) {
                    Investment.updateBearSellPrice(ticker, executedPrice);
                }

                global.wallet -= qty * executedPrice * (1 + global.TRADING_FEE);
                global.currencyWallet[ticker].price = Investment.weightedAvgPrice(ticker, executedPrice, qty);
                global.currencyWallet[ticker].repeatedBuyPrice = executedPrice * (1 - global.REPEATED_BUY_MARGIN); // record last buy price
                global.currencyWallet[ticker].qty += qty;
                customUtil.printBuy(ticker, qty, executedPrice);
                // customUtil.printWalletStatus();
                // customUtil.printPNL();
                util.log(`\n****************************************************`);
                util.log(res);
                util.log(`****************************************************\n`);
                customUtil.printWalletStatus();
                db.storeTransactionToDB(ticker, executedPrice, qty, 1);
                await Investment.syncCurrencyWallet();
                global.storedWeightedSignalScore[ticker] = 0; // clear score
            }
            catch(e) {
                util.error('!!!!!!!!!!!!!!!! Market Order Error !!!!!!!!!!!!!!!!');
                util.error(e.stack);
            }
        }
        else if (side === 'bearSell') {
            try {
                let res = await executor.submitMarket(ticker, qty, 'sell');
                res = JSON.parse(res);
                let executedPrice = parseFloat(res.price);
                delete res.is_cancelled;
                delete res.exchange;
                delete res.was_forced;
                delete res.is_live;
                delete res.is_hidden;

                global.wallet += qty * executedPrice * (1 - global.TRADING_FEE);
                Investment.updateRepeatedBuyPrice(ticker, executedPrice);
                customUtil.printBearSell(ticker, qty, executedPrice);
                db.storeTransactionToDB(ticker, executedPrice, qty, 0);
                let tempPrice = Investment.weightedAvgPrice(ticker, executedPrice, -qty);
                global.currencyWallet[ticker].price = tempPrice !== null ? tempPrice : 0;
                global.currencyWallet[ticker].qty -= qty;
                global.currencyWallet[ticker].bearSellPrice = executedPrice * (1 + global.TRADING_FEE + global.MIN_PROFIT_PERCENTAGE);
                global.storedWeightedSignalScore[ticker] = 0; // clear score
                await Investment.syncCurrencyWallet();
                customUtil.printWalletStatus(global.INITIAL_INVESTMENT,  global.wallet,  global.currencyWallet,  global.latestPrice);
            }
            catch (e) {
                console.error('There was a problem submitting a bear sell market order: ' + e.stack);
            }
        }
    }

    static setupCurrencyWallet(ticker) {
        global.currencyWallet[ticker] =  global.currencyWallet[ticker] !== undefined ?  global.currencyWallet[ticker] : {};
        global.currencyWallet[ticker].qty =  global.currencyWallet[ticker].qty !== undefined ?  global.currencyWallet[ticker].qty : 0;
        global.currencyWallet[ticker].price =  global.currencyWallet[ticker].price !== undefined ?  global.currencyWallet[ticker].price : 0;
    }

    static async syncCurrencyWallet () {
        let pos = await executor.getActivePositions();
        global.wallet = global.INITIAL_INVESTMENT;
        for (let item of JSON.parse(pos)) {
            let ticker = item.symbol.toUpperCase();
            this.setupCurrencyWallet(ticker);

            global.currencyWallet[ticker].qty = parseFloat(item.amount);
            global.currencyWallet[ticker].price= parseFloat(item.base);
            global.wallet -= item.amount * item.base;
        }
        customUtil.printWalletStatus();
    }

    static postSellTradeCleanup (ticker) {
        global.currencyWallet[ticker].price = 0; // clear the price after sold
        global.currencyWallet[ticker].repeatedBuyPrice = 0; // clear the price after sold
        global.currencyWallet[ticker].bearSellPrice = 0; // clear the price after sold
        global.storedWeightedSignalScore[ticker] = 0; // clear score
    }
}

module.exports = Investment;
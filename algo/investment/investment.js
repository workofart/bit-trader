const MIN_AMOUNT = require('../minOrderBinance'),
      util = require('util'),
      customUtil = require('../custom_util'),
      db = require('../store'),
      _ = require('underscore'),
      executor = require('../executorBinance'),
      InvestmentReq = require('./investmentReq'),
      InvestmentUtils = require('./investmentUtils');

class Investment {


    static async invest(score, ticker, data) {
      if (global.latestPrice[ticker] !== undefined) {
            InvestmentUtils.setupCurrencyWallet(ticker);
		    const minAmount = _.find(MIN_AMOUNT, (item) => { return item.pair === ticker}).minimum_order_size;
            let timestamp = data.timestamp,
				price = global.latestPrice[ticker],
                qty = InvestmentUtils.calculateBuyQty(ticker);

            // BUY
            if (Investment.buyPositionCheck(ticker, qty, price, score) && InvestmentReq.downTrendBuyReq(ticker))
            {
                if (global.isLive && qty !== 0) {
                    await Investment.submitMarketOrder(ticker, 'buy', qty, price);
                }
                else if (qty !== 0) {
                    await Investment.submitDummyOrder(ticker, 'buy', qty, price, timestamp);
                }
            }

            // SELL
            else if ((Investment.sellPositionCheck(ticker, price, score) || global.currencyWallet[ticker].upTrendLimitPrice > 0) && InvestmentReq.maxProfitStopLimitReq(ticker)) {
                qty = Math.ceil(global.currencyWallet[ticker].qty / price / minAmount) * minAmount;
                if (global.isLive) {
                    await Investment.submitMarketOrder(ticker, 'sell', qty, price);
                }
                else {
                    await Investment.submitDummyOrder(ticker, 'sell', qty, price, timestamp);
                }
            }

            // Downward Market SELL
            else if (Investment.bearSellPositionCheck(ticker, price, score)) {
                let sellQty = global.currencyWallet[ticker].qty * global.BEAR_SELL_PERCENTAGE;

                sellQty = Math.ceil(sellQty / minAmount) * minAmount;

                sellQty = sellQty >= global.currencyWallet[ticker].qty ? 0 : sellQty;

                if (global.isLive && sellQty !== 0) {
                    await Investment.submitMarketOrder(ticker, 'bearSell', sellQty, price);
                }
                else if (sellQty !== 0) {
                    await Investment.submitDummyOrder(ticker, 'bearSell', sellQty, price, timestamp);
                }
            }
            // else if (InvestmentReq.positionCheck(ticker) === 'none' || InvestmentReq.positionCheck(ticker) === 'short') {
            //     if (Investment.shortPositionCheck(ticker, qty, price, score)) {
            //         if (global.isLive) {
            //             Investment.submitMarketOrder(ticker, 'short', qty, price);
            //         }
            //         else {
            //             Investment.submitDummyOrder(ticker, 'short', qty, price, timestamp);
            //         }
            //     }
            // }
        }
    }

    static shortPositionCheck(ticker, qty, price, score) {
        return (InvestmentReq.shortSignalReq(score) && InvestmentReq.fiatBalanceReq(qty, price))
    }

    // Checks the long position on hand and evaluate whether
    // it's logical to exit the position
    static sellPositionCheck(ticker, price, score) {
        return (InvestmentReq.minProfitReq(ticker, price) || InvestmentReq.stopLossReq(ticker, price))
            && InvestmentReq.currencyBalanceReq(ticker);
    }

    static bearSellPositionCheck(ticker, price, score) {
        return (
            InvestmentReq.sellSignalReq(score) && InvestmentReq.bearMarketReq(ticker) && InvestmentReq.repeatedSellReq(ticker, price)
        )
    }

    // Checks the long position on hand and evaluate whether
    // it's logical to enter the position
    static buyPositionCheck(ticker, qty, price, score) {
        if (!global.currencyWallet[ticker].isDownTrendBuy &&
                (InvestmentReq.buySignalReq(score) &&
                    InvestmentReq.fiatBalanceReq(qty, price) &&
                    InvestmentReq.repeatedBuyReq(ticker, price) &&
                    !InvestmentReq.frozenTickerReq(ticker)
                ) ||
                (InvestmentReq.extremeBuySignalReq(score) &&
                    !InvestmentReq.frozenTickerReq(ticker) &&
                    InvestmentReq.fiatBalanceReq(qty, price)
                )
            ) {
            global.currencyWallet[ticker].isDownTrendBuy = true;
            global.currencyWallet[ticker].downTrendCounter = 0;
            return true;
        }
        else if (global.currencyWallet[ticker].downTrendCounter > 20) {
            global.currencyWallet[ticker].isDownTrendBuy = false;
            global.currencyWallet[ticker].downTrendCounter = 0;
        }
        else if (global.currencyWallet[ticker].isDownTrendBuy &&
                InvestmentReq.fiatBalanceReq(qty, price) &&
                !InvestmentReq.frozenTickerReq(ticker)) {
            return true;
        }
        return false;
    }


    static async submitDummyOrder (ticker, side, qty, price, timestamp) {
        if (side === 'sell') {
            global.wallet +=  global.currencyWallet[ticker].qty * price * (1 - global.TRADING_FEE);
            customUtil.printSell(ticker, price, global.currencyWallet[ticker].qty);
            await db.storeTransactionToDB(ticker, price,  global.currencyWallet[ticker].qty, 0, timestamp);
            global.currencyWallet[ticker].qty = 0; // clear qty after sold, assuming always sell the same qty
            InvestmentUtils.postSellTradeCleanup(ticker);
            customUtil.printWalletStatus();
            !global.isParamTune && customUtil.printPNL();
			await db.storeWalletState(timestamp);
        }
        else if (side === 'buy') {
            InvestmentUtils.updateBearSellPrice(ticker, price);

            global.wallet -= qty * price * (1 + global.TRADING_FEE);
            global.currencyWallet[ticker].price = InvestmentUtils.weightedAvgPrice(ticker, price, qty);
            global.currencyWallet[ticker].upTrendLimitPrice = 0;
            global.currencyWallet[ticker].downTrendLimitPrice = 99999;
            global.currencyWallet[ticker].repeatedBuyPrice = price * (1 - global.REPEATED_BUY_MARGIN); // record last buy price * (1-repeatedBuyPercentage)
            global.currencyWallet[ticker].qty += qty;
            global.currencyWallet[ticker].isDownTrendBuy = false;
            global.currencyWallet[ticker].downTrendCounter = 0;
            customUtil.printBuy(ticker, qty, price);
            customUtil.printWalletStatus();
            !global.isParamTune && customUtil.printPNL();
            await db.storeTransactionToDB(ticker, price, qty, 1, timestamp);
            global.storedWeightedSignalScore[ticker] = 0; // clear score
			await db.storeWalletState(timestamp);
        }
        else if (side === 'bearSell') {
            global.wallet += qty * price * (1 - global.TRADING_FEE);
            customUtil.printBearSell(ticker, qty, price);
            await db.storeTransactionToDB(ticker, price, qty, 0, timestamp);
            let tempPrice = InvestmentUtils.weightedAvgPrice(ticker, price, -qty);
            InvestmentUtils.updateRepeatedBuyPrice(ticker, price);
            global.currencyWallet[ticker].price = tempPrice !== null ? tempPrice : 0;
            global.currencyWallet[ticker].qty -= qty;
            global.currencyWallet[ticker].bearSellPrice = price * (1 + global.TRADING_FEE + global.MIN_PROFIT_PERCENTAGE);
            customUtil.printWalletStatus();
            !global.isParamTune && customUtil.printPNL();
            global.storedWeightedSignalScore[ticker] = 0; // clear score
			await db.storeWalletState(timestamp);
        }
    }

    static async submitMarketOrder (ticker, side, qty, price) {
        // await InvestmentUtils.syncCurrencyWallet();
        if (side === 'sell' && InvestmentReq.currencyBalanceReq(ticker)) {
            try {
                let res = await executor.submitMarket(ticker, qty, side);
				global.currencyWallet[ticker].qty -= qty;
                global.wallet +=  qty * price * (1 - global.TRADING_FEE);
                customUtil.printSell(ticker, price, qty);
                customUtil.printOrderResponse(res);
                await db.storeTransactionToDB(ticker, price, qty, 0);
                InvestmentUtils.postSellTradeCleanup(ticker);
				await db.storeWalletState();
            }
            catch(e) {
                util.error('!!!!!!!!!!!!!!!! Market Order Error !!!!!!!!!!!!!!!!');
                util.error(e.stack);
            }
        }
        else if (side === 'buy' && qty > 0) {
            try {
                let res = await executor.submitMarket(ticker, qty, side);
                InvestmentUtils.updateBearSellPrice(ticker, price);

                global.wallet -= qty * price * (1 + global.TRADING_FEE);
                global.currencyWallet[ticker].price = InvestmentUtils.weightedAvgPrice(ticker, price, qty);
                global.currencyWallet[ticker].repeatedBuyPrice = price * (1 - global.REPEATED_BUY_MARGIN); // record last buy price
                global.currencyWallet[ticker].qty += qty;
                global.currencyWallet[ticker].upTrendLimitPrice = 0;
                global.currencyWallet[ticker].downTrendLimitPrice = 99999;
                global.currencyWallet[ticker].isDownTrendBuy = false;
                global.currencyWallet[ticker].downTrendCounter = 0;
                customUtil.printBuy(ticker, qty, price);
                // customUtil.printWalletStatus();
                // customUtil.printPNL();
                customUtil.printOrderResponse(res);
                await db.storeTransactionToDB(ticker, price, qty, 1);
				await db.storeWalletState();
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
                global.wallet += qty * price * (1 - global.TRADING_FEE);
                InvestmentUtils.updateRepeatedBuyPrice(ticker, price);
                customUtil.printBearSell(ticker, qty, price);
                await db.storeTransactionToDB(ticker, price, qty, 0);
                let tempPrice = InvestmentUtils.weightedAvgPrice(ticker, price, -qty);
                global.currencyWallet[ticker].price = tempPrice !== null ? tempPrice : 0;
                global.currencyWallet[ticker].qty -= qty;
                global.currencyWallet[ticker].bearSellPrice = price * (1 + global.TRADING_FEE + global.MIN_PROFIT_PERCENTAGE);
                global.storedWeightedSignalScore[ticker] = 0; // clear score
				await db.storeWalletState();
				customUtil.printOrderResponse(res);
            }
            catch (e) {
                console.error('There was a problem submitting a bear sell market order: ' + e.stack);
            }
        }
        else if (side === 'short') {
            try {
                let res = await executor.submitMarket(ticker, qty, 'sell');
                res = JSON.parse(res);
                let executedPrice = parseFloat(res.price);
                customUtil.sanitizeOrderResponse(res);

                global.wallet -= qty * price * (1 - global.TRADING_FEE);
                InvestmentUtils.updateRepeatedShortPrice(ticker, price);
                customUtil.printShort(ticker, qty, price);
                await db.storeTransactionToDB(ticker, price, qty, 0);
                let tempPrice = InvestmentUtils.weightedAvgPrice(ticker, price, -qty);
                global.currencyWallet[ticker].price = tempPrice !== null ? tempPrice : 0;
                global.currencyWallet[ticker].qty -= qty;
                global.currencyWallet[ticker].bearSellPrice = price * (1 + global.TRADING_FEE + global.MIN_PROFIT_PERCENTAGE);
                global.storedWeightedSignalScore[ticker] = 0; // clear score
				await db.storeWalletState();
            }
            catch (e) {
                console.error('There was a problem submitting a short market order: ' + e.stack);
            }
        }
    }

}

module.exports = Investment;
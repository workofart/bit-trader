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
            const MIN = _.find(MIN_AMOUNT, item => item.pair === ticker),
                minAmount = parseFloat(MIN.minimum_order_size),
                stepSize = MIN.stepSize;

            let timestamp = data.timestamp,
                price = global.latestPrice[ticker],
                qty = InvestmentUtils.calculateBuyQty(ticker);

            Investment.isImmediateLossSignal(ticker, price);

            // BUY
            if (Investment.buyPositionCheck(ticker, qty, price, score) && InvestmentReq.downTrendBuyReq(ticker)) {
                if (global.isLive && qty !== 0) {
                    await Investment.submitMarketOrder(ticker, 'buy', qty, price);
                } else if (qty !== 0) {
                    await Investment.submitDummyOrder(ticker, 'buy', qty, price, timestamp);
                }
            }

            // SELL
            else if (
                (
                    (Investment.sellPositionCheck(ticker, price, score) || global.currencyWallet[ticker].upTrendLimitPrice > 0)
                    && InvestmentReq.maxProfitStopLimitReq(ticker))
                || InvestmentReq.conservativeSell(ticker, price)
            ) {
                qty = Math.floor(global.currencyWallet[ticker].qty / minAmount) * minAmount;
                if (global.isLive) {
                    await Investment.submitMarketOrder(ticker, 'sell', qty, price);
                } else {
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
                } else if (sellQty !== 0) {
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
        return (InvestmentReq.shortSignalReq(score) && InvestmentReq.fiatBalanceReq(qty, price));
    }

    // Checks the long position on hand and evaluate whether
    // it's logical to exit the position
    static sellPositionCheck(ticker, price, score) {
        return (InvestmentReq.minProfitReq(ticker, price) || InvestmentReq.stopLossReq(ticker, price) || global.currencyWallet[ticker].isImmediateLossSignal)
            && InvestmentReq.currencyBalanceReq(ticker);
    }

    static bearSellPositionCheck(ticker, price, score) {
        return (
            InvestmentReq.sellSignalReq(score) && InvestmentReq.bearMarketReq(ticker) && InvestmentReq.repeatedSellReq(ticker, price)
        );
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
        } else if (global.currencyWallet[ticker].downTrendCounter > 20) {
            global.currencyWallet[ticker].isDownTrendBuy = false;
            global.currencyWallet[ticker].downTrendCounter = 0;
        } else if (global.currencyWallet[ticker].isDownTrendBuy &&
                InvestmentReq.fiatBalanceReq(qty, price) &&
                !InvestmentReq.frozenTickerReq(ticker)) {
            return true;
        }
        return false;
    }

    static isImmediateLossSignal(ticker, price) {
        if (global.currencyWallet[ticker].price * (1 - global.MIN_PROFIT_PERCENTAGE) > price && global.currencyWallet[ticker].qty > 0) {
            global.currencyWallet[ticker].immediateLossSignal = true;
        }
    }

    static async submitDummyOrder(ticker, side, qty, price, timestamp) {
        if (side === 'sell') {
            global.wallet += global.currencyWallet[ticker].qty * price * (1 - global.TRADING_FEE);
            customUtil.printSell(ticker, price, global.currencyWallet[ticker].qty);
            db.storeTransactionToDB(ticker, price, global.currencyWallet[ticker].qty, 0, timestamp);
            global.currencyWallet[ticker].qty = 0; // clear qty after sold, assuming always sell the same qty
            InvestmentUtils.postSellTradeCleanup(ticker);
            customUtil.printWalletStatus();
            !global.isParamTune && customUtil.printPNL();
            db.storeWalletState(timestamp);
        } else if (side === 'buy') {
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
            db.storeTransactionToDB(ticker, price, qty, 1, timestamp);
            global.storedWeightedSignalScore[ticker] = 0; // clear score
            await db.storeWalletState(timestamp);
        } else if (side === 'bearSell') {
            global.wallet += qty * price * (1 - global.TRADING_FEE);
            customUtil.printBearSell(ticker, qty, price);
            db.storeTransactionToDB(ticker, price, qty, 0, timestamp);
            const tempPrice = InvestmentUtils.weightedAvgPrice(ticker, price, -qty);
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

    static async submitMarketOrder(ticker, side, qty, price) {
    // await InvestmentUtils.syncCurrencyWallet();
        if (side === 'sell' && InvestmentReq.currencyBalanceReq(ticker)) {
            try {
                const res = await executor.submitMarket(ticker, qty, side);
                const { filledQty, filledPrice, totalValue } = Investment.parseFillResponse(res);

                global.currencyWallet[ticker].qty -= filledQty;
                global.wallet += totalValue;

                customUtil.printSell(ticker, filledPrice, filledQty);
                customUtil.printOrderResponse(res);

                InvestmentUtils.postSellTradeCleanup(ticker);

                await db.storeTransactionToDB(ticker, filledPrice, filledQty, 0);
                await db.storeWalletState();
            } catch (e) {
                util.error('!!!!!!!!!!!!!!!! Market Order Error !!!!!!!!!!!!!!!!');
                util.error(e.stack);
            }
        } else if (side === 'buy' && qty > 0) {
            try {
                const res = await executor.submitMarket(ticker, qty, side);

                const { filledQty, filledPrice, totalValue } = Investment.parseFillResponse(res);

                InvestmentUtils.updateBearSellPrice(ticker, filledPrice);

                global.wallet -= totalValue;
                global.currencyWallet[ticker].price = InvestmentUtils.weightedAvgPrice(ticker, filledPrice, filledQty);
                global.currencyWallet[ticker].repeatedBuyPrice = filledPrice * (1 - global.REPEATED_BUY_MARGIN); // record last buy price
                global.currencyWallet[ticker].qty += filledQty;
                global.currencyWallet[ticker].upTrendLimitPrice = 0;
                global.currencyWallet[ticker].downTrendLimitPrice = 99999;
                global.currencyWallet[ticker].isDownTrendBuy = false;
                global.currencyWallet[ticker].downTrendCounter = 0;
                global.storedWeightedSignalScore[ticker] = 0; // clear score

                customUtil.printBuy(ticker, filledQty, filledPrice);
                // customUtil.printWalletStatus();
                // customUtil.printPNL();
                customUtil.printOrderResponse(res);
                await db.storeTransactionToDB(ticker, filledPrice, filledQty, 1);
                await db.storeWalletState();
            } catch (e) {
                util.error('!!!!!!!!!!!!!!!! Market Order Error !!!!!!!!!!!!!!!!');
                util.error(e.stack);
            }
        } else if (side === 'bearSell') {
            try {
                const res = await executor.submitMarket(ticker, qty, 'sell');

                const { filledQty, filledPrice, totalValue } = Investment.parseFillResponse(res);

                InvestmentUtils.updateRepeatedBuyPrice(ticker, filledPrice);
                customUtil.printBearSell(ticker, filledQty, filledPrice);
                await db.storeTransactionToDB(ticker, filledPrice, filledQty, 0);
                const tempPrice = InvestmentUtils.weightedAvgPrice(ticker, filledPrice, -filledQty);

                global.wallet += totalValue;
                global.currencyWallet[ticker].price = tempPrice !== null ? tempPrice : 0;
                global.currencyWallet[ticker].qty -= filledQty;
                global.currencyWallet[ticker].bearSellPrice = filledPrice * (1 + global.TRADING_FEE + global.MIN_PROFIT_PERCENTAGE);
                global.storedWeightedSignalScore[ticker] = 0; // clear score
                await db.storeWalletState();
                customUtil.printOrderResponse(res);
            } catch (e) {
                console.error(`There was a problem submitting a bear sell market order: ${e.stack}`);
            }
        }
    }

    static parseFillResponse(res) {
        let filledPrice,
            filledQty = 0,
            totalValue = 0;

        _.forEach(res.fills, (fill) => {
            totalValue += parseFloat(fill.price) * parseFloat(fill.qty);
            filledQty += parseFloat(fill.qty);
            if (fill.commissionAsset !== 'BTC') {
                global.currencyWallet[`${fill.commissionAsset}BTC`].qty -= parseFloat(fill.commission);
            } else {
                global.wallet -= parseFloat(fill.commission);
            }
        });

        filledPrice = totalValue / filledQty;
        return {
            filledPrice,
            filledQty,
            totalValue,
        };
    }
}

module.exports = Investment;

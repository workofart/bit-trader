const executor = require('../executor'),
      customUtil = require('../custom_util'),
      MIN_AMOUNT = require('../minOrder');

class InvestmentUtils {

    static positionCheck(ticker) {
        if (global.currencyWallet[ticker].qty > 0) {
            return 'long';
        }
        else if (global.currencyWallet[ticker].qty < 0) {
            return 'short';
        }
        return 'none';
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

    static updateRepeatedShortPrice (ticker, price) {
        global.currencyWallet[ticker].repeatedShortPrice = price * (1 + global.TRADING_FEE + global.MIN_PROFIT_PERCENTAGE);
    }

    // if a repeated buy occurred, then lower the repeatedSell to profit % of repeated buy
    // Simulating a subposition long buy
    static updateBearSellPrice (ticker, price) {
      if (global.currencyWallet[ticker].repeatedBuyPrice > 0) {
        global.currencyWallet[ticker].bearSellPrice = price * (1 + global.TRADING_FEE + global.MIN_PROFIT_PERCENTAGE);
      }
    }

    static setupCurrencyWallet(ticker) {
        global.currencyWallet[ticker] =  global.currencyWallet[ticker] !== undefined ?  global.currencyWallet[ticker] : {};
        global.currencyWallet[ticker].qty =  global.currencyWallet[ticker].qty !== undefined ?  global.currencyWallet[ticker].qty : 0;
        global.currencyWallet[ticker].price =  global.currencyWallet[ticker].price !== undefined ?  global.currencyWallet[ticker].price : 0;
        global.currencyWallet[ticker].downTrendLimitPrice = global.currencyWallet[ticker].downTrendLimitPrice !== undefined ?  global.currencyWallet[ticker].downTrendLimitPrice : 99999;
        global.currencyWallet[ticker].isDownTrendBuy = global.currencyWallet[ticker].isDownTrendBuy !== undefined ? global.currencyWallet[ticker].isDownTrendBuy : false;
    }

    static async syncCurrencyWallet (isPrintStatus = false) {
        let pos = await executor.getActivePositions();
        global.wallet = global.INITIAL_INVESTMENT;
        for (let item of JSON.parse(pos)) {
            let ticker = item.symbol.toUpperCase();
            this.setupCurrencyWallet(ticker);

            global.currencyWallet[ticker].qty = parseFloat(item.amount);
            global.currencyWallet[ticker].price= parseFloat(item.base);
            global.wallet -= item.amount * item.base;
        }
        isPrintStatus && customUtil.printWalletStatus();
    }

    static postSellTradeCleanup (ticker) {
        global.currencyWallet[ticker].price = 0; // clear the price after sold
        global.currencyWallet[ticker].repeatedBuyPrice = 0; // clear the price after sold
        global.currencyWallet[ticker].bearSellPrice = 0; // clear the price after sold
        global.currencyWallet[ticker].repeatedShortPrice = 0;
        global.currencyWallet[ticker].upTrendLimitPrice = 0;
        global.currencyWallet[ticker].downTrendLimitPrice = 99999;
        global.currencyWallet[ticker].isDownTrendBuy = false;
        global.storedWeightedSignalScore[ticker] = 0; // clear score
    }

    static calculateBuyQty (ticker) {
      const minAmount = _.find(MIN_AMOUNT, (item) => { return item.pair === ticker.toLowerCase()}).minimum_order_size;

      let price =  global.latestPrice[ticker],
          times = (global.INVEST_PERCENTAGE * global.INITIAL_INVESTMENT / price / minAmount).toFixed(0),
          qty = parseFloat((minAmount * times).toFixed(2));

    }

}

module.exports = InvestmentUtils;
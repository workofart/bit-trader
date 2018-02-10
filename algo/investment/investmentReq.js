const minAmount = require('../minOrderBinance'),
      util = require('util'),
      _ = require('underscore');

class InvestmentReq {

    static frozenTickerReq(ticker) {
        if(global.frozenTickers[ticker]) {
            // !global.isParamTune && util.log('Avoided buying ' + ticker);
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

    static shortSignalReq(score) {
        return score <= global.SHORT_SIGNAL_TRIGGER;
    }

    static sellSignalReq (score) {
        return score <= global.SELL_SIGNAL_TRIGGER;
    }

    static buySignalReq (score) {
        return score >= global.BUY_SIGNAL_TRIGGER;
    }

    static fiatBalanceReq (qty, price) {
        return global.wallet >= qty * price;
    }

    static currencyBalanceReq (ticker) {
        let minNotional = _.find(minAmount, (item) => { return item.pair === ticker}).minNotional;
        return global.currencyWallet[ticker].qty * global.latestPrice[ticker] > minNotional;
    }

    static minProfitReq (ticker, price) {
        let lastPrice =  global.currencyWallet[ticker].price;
        return (price > lastPrice * (1 + global.MIN_PROFIT_PERCENTAGE + global.TRADING_FEE))
    }

    static maxProfitStopLimitReq (ticker) {
        let price = global.latestPrice[ticker];
        global.currencyWallet[ticker].upTrendLimitPrice = global.currencyWallet[ticker].upTrendLimitPrice < price ?
            price : global.currencyWallet[ticker].upTrendLimitPrice;

        // if (price === global.currencyWallet[ticker].upTrendLimitPrice) {
        //     console.log(`Bumping [${ticker}] upTrendLimitPrice: ${price}`);
        // }

        return this.currencyBalanceReq(ticker) && price < global.currencyWallet[ticker].upTrendLimitPrice * (1 - global.UP_STOP_LIMIT)
    }

    static downTrendBuyReq (ticker) {
        if (global.currencyWallet[ticker].isDownTrendBuy) {
            let price = global.latestPrice[ticker];

            if (global.currencyWallet[ticker].downTrendLimitPrice > price) {
                global.currencyWallet[ticker].downTrendLimitPrice = price;
                global.currencyWallet[ticker].downTrendCounter = 0;
            }
            else {
                // Increment Counter for max window to wait to enter position
                global.currencyWallet[ticker].downTrendCounter += 1;
            }

            // if (price === global.currencyWallet[ticker].downTrendLimitPrice) {
            //     console.log(`Lowering [${ticker}] downTrendLimitPrice: ${price}`);
            // }
            return price > global.currencyWallet[ticker].downTrendLimitPrice * (1 + global.DOWN_STOP_LIMIT);
        }
        return false;

    }

	static positionCheck(ticker) {
		if (global.currencyWallet[ticker].qty > 0) {
			return 'long';
		}
		else if (global.currencyWallet[ticker].qty < 0) {
			return 'short';
		}
		return 'none';
	}

}

module.exports = InvestmentReq;
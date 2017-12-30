require('../env-setup');

const Investment = require('../../algo/investment'),
      investConstants = require('../../algo/constants').investment;

describe('Investment Unit Tests', () => {

    let ticker = 'btcusd';

    describe('Repeated Buy check', () => {
        it('should return false with same or higher price', () => {
            let result = Investment.repeatedBuyReq(ticker, global.currencyWallet[ticker].price * 1.1);
            expect(result).to.be.false;
        });

        it('should return true with lower price', () => {
            let result = Investment.repeatedBuyReq(ticker, global.currencyWallet[ticker].price * 0.8);
            expect(result).to.be.true;
        });

        it('should return true with no prior price', () => {
            let oldPrice = global.currencyWallet[ticker].price;
            global.currencyWallet[ticker].price = 0;
            let result = Investment.repeatedBuyReq(ticker, 10);
            global.currencyWallet[ticker].price = oldPrice;
            expect(result).to.be.true;
        })
    });

    describe('Stop Loss check', () => {
        it('should return false with within stop loss', () => {
            let result = Investment.stopLossReq(ticker, global.currencyWallet[ticker].price * 0.9);
            expect(result).to.be.false;
        });
        it('should return true exceeding stop loss', () => {
            let result = Investment.stopLossReq(ticker, global.currencyWallet[ticker].price * 0.01);
            expect(result).to.be.true;
        });
    });

    describe('Sell Signal Check', () => {
        it('should return true on a valid sell signal', () => {
            expect(Investment.sellSignalReq(investConstants.SELL_SIGNAL_TRIGGER)).to.be.true;
        });
        it('should return false on an invalid sell signal', () => {
            expect(Investment.sellSignalReq(investConstants.SELL_SIGNAL_TRIGGER + 1)).to.be.false;
        });
    })

    describe('Buy Signal Check', () => {
        it('should return true on a valid buy signal', () => {
            expect(Investment.buySignalReq(investConstants.BUY_SIGNAL_TRIGGER)).to.be.true;
        });
        it('should return false on an invalid sell signal', () => {
            expect(Investment.buySignalReq(investConstants.BUY_SIGNAL_TRIGGER - 1)).to.be.false;
        });
    })

    describe('Fiat Balance Check', () => {
        it('should return true with sufficient balance to buy', () => {
            expect(Investment.fiatBalanceReq(1, 1)).to.be.true;
        })

        it('should return false with insufficient balance to buy', () => {
            expect(Investment.fiatBalanceReq(100, 1)).to.be.false;
        })
    });

    describe('Currency Balance Check', () => {
        it('should return true with sufficient balance to sell', () => {
            let oldQty = global.currencyWallet[ticker].qty;
            global.currencyWallet[ticker].qty = 1;
            expect(Investment.currencyBalanceReq(ticker)).to.be.true;
            global.currencyWallet[ticker].qty = oldQty;
        })

        it('should return false with insufficient balance to sell', () => {
            let oldQty = global.currencyWallet[ticker].qty;
            global.currencyWallet[ticker].qty = 0;
            expect(Investment.currencyBalanceReq(ticker)).to.be.false;
            global.currencyWallet[ticker].qty = oldQty;
        })

    });

    describe('Min Profit Check', () => {
        it('should return true covering profit and trading fees', () => {
            let lastPrice = global.currencyWallet[ticker].price,
                targetPrice = lastPrice * (1 + investConstants.MIN_PROFIT_PERCENTAGE + investConstants.TRADING_FEE) + 1;
            expect(Investment.minProfitReq(ticker, targetPrice)).to.be.true;
        })

        it('should return false not enough to cover profit and trading fees', () => {
            let lastPrice = global.currencyWallet[ticker].price,
                targetPrice = lastPrice * (1 + investConstants.MIN_PROFIT_PERCENTAGE + investConstants.TRADING_FEE) - 1;
            expect(Investment.minProfitReq(ticker, targetPrice)).to.be.false;
        })
    })

    describe('Weighted Average Price', () => {
        it('should return 20 as the weighted average price', () => {
            expect(Investment.weightedAvgPrice(ticker, 30, 1)).to.equal(20);
        })
    })
});


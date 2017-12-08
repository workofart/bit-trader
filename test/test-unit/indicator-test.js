require('../env-setup');

const indicator = require('../../algo/indicators');

describe('Indicators', () => {
    let testInput = [81.59, 81.06, 82.87, 83, 83.61, 83.15, 82.84, 83.99, 84.55],
        highInput = [82.15, 81.89, 83.03, 83.3, 83.85, 83.9, 83.33, 84.3, 84.84],
        lowInput = [81.29, 80.64, 81.31, 82.65, 83.07, 83.11, 82.49, 82.3, 84.15];

    describe('BB(input, 5, 2)', () => {
        it('should return lower, mid, and upper bollinger bands', async () => {
            let result = await indicator.BB(testInput, 5, 2);
            expect(result).to.deep.equal({bb_lower: 82.42, bb_upper: 84.84});
        });
    });

    describe('RSI(input, 5)', () => {
        it('should return rsi for 5 price points', async () => {
            let result = await indicator.RSI(testInput, 5);
            expect(result).to.equal(79.8);
        });
    });

    describe('BB & RSI Signals', () => {
        it('should return -10 as the BB & RSI sell signal for with 5 period and 1.5 std', async () => {
            let result = await indicator.calculateBB_RSI(testInput, 1.5, 5);
            expect(result).to.equal(-10);
        });
    });

    describe('ADX Trend(low, high, close)', () => {
        it('should return 41.38 as the ADX given 9 data points and period of 5', async () => {
            let result = await indicator.ADX(highInput, lowInput, testInput, 5);
            expect(result).to.equal(41.38);
        })
    })
})
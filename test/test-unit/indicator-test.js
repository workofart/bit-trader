require('../env-setup');

const indicator = require('../../algo/indicators');

describe('Indicators', () => {
    let testInput = [81.59, 81.06, 82.87, 83, 83.61, 83.15, 82.84, 85, 87];
    describe('BB(input, 5, 2)', () => {
        it('should return lower, mid, and upper bollinger bands', () => {
            let result = indicator.BB(testInput, 5, 1.5);
            expect(result).to.eventually.deep.equal({bb_lower: 82.0246, bb_upper: 86.6154});
        });
    });

    describe('RSI(input, 5)', () => {
        it('should return rsi for 5 price points', () => {
            let result = indicator.RSI(testInput, 5);
            expect(result).to.eventually.equal(87.71);
        });
    });

    describe('BB & RSI Signals', () => {
        it('should return -10 as the BB & RSI sell signal for with 5 period and 1.5 std', () => {
            let result = indicator.calculateBB_RSI(testInput, 1.5, 5);
            expect(result).to.eventually.equal(-10);
        });
    });
})
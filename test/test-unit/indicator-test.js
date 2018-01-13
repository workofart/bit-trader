require('../env-setup');

const indicator = require('../../algo/indicators');

describe('Indicators', () => {
    let testInput = [81.59, 81.06, 82.87, 83, 83.61, 83.15, 82.84, 83.99, 84.55],
        highInput = [82.15, 81.89, 83.03, 83.3, 83.85, 83.9, 83.33, 84.3, 84.84],
        lowInput = [81.29, 80.64, 81.31, 82.65, 83.07, 83.11, 82.49, 82.3, 84.15],
        corrArr1 = [1, 2, 3, 4, 5, 6],
        corrArr2 = [2, 2, 3, 4, 5, 60];

    describe('BB(input, 5, 2)', () => {
        it('should return lower, mid, and upper bollinger bands', async () => {
            let result = await indicator.BB(testInput, 5, 2);
            expect(result).to.deep.equal({bb_lower: 82.42, bb_upper: 84.84});
        });
    });

    describe('RSI(input, 5)', () => {
        it('should return rsi for 5 price points', async () => {
            let result = await indicator.RSI(testInput, [5]);
            expect(result).to.equal(79.8);
        });
    });

    describe('BB & RSI Signals', () => {
        it('should return -10 as the BB & RSI sell signal for with 5 period and 1.5 std', async () => {
            let result = await indicator.calculateBB_RSI(testInput, 5);
            expect(result).to.equal(-10);
        });
        it('should return 11 as the BB & RSI sell signal for with 5 period and 1.5 std', async () => {
            let testInput2 = [... testInput, 30];
            let result = await indicator.calculateBB_RSI(testInput2, 5);
            expect(result).to.equal(11);
        });
        it('should return 10 as the BB & RSI sell signal for with 5 period and 1.5 std', async () => {
            let testInput2 = [... testInput, 75];
            let result = await indicator.calculateBB_RSI(testInput2, 5);
            expect(result).to.equal(10);
        });
    });

    describe('ADX Trend(low, high, close)', () => {
        it('should return 41.38 as the ADX given 9 data points and period of 5', async () => {
            let result = await indicator.ADX(highInput, lowInput, testInput, 5);
            expect(result).to.equal(41.38);
        })
    })

    describe('Correlation Indicator', () => {
        it('should return 0.89 as the correlation coefficient', () => {
            let result = parseFloat(indicator.correlation(corrArr1, corrArr2).toFixed(2));
            expect(result).to.equal(0.69);
        });
        it('should return 0.79 as the correlation coefficient', () => {
            let a1 = [101.36, 101.39, 101.31, 101.31, 101.35, 101.29, 101.25, 101.42, 101.35, 101.36, 101.4, 101.5, 101.47, 101.47, 101.55];
            let a2 = [11927, 11914, 11912, 11910, 11906, 11918, 11933, 11952, 11951, 11959, 11981, 11977, 11981, 11973, 11991];
            let result = parseFloat(indicator.correlation(a1, a2).toFixed(2));
            expect(result).to.equal(0.79);
        });
        it('should return NaN as the correlation coefficient', () => {
            let a1 = [1356.1, 1356.1, 1356.1, 1356.1, 1356.1];
            let a2 = [15530, 15410.1, 15479, 15462, 15474];
            let result = parseFloat(indicator.correlation(a1, a2).toFixed(2));
            expect(isNaN(result)).to.be.true;
        })
    })
})
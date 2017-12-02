var assert = require('assert');
var chai = require('chai');
var expect = chai.expect;
chai.use(require('chai-as-promised'));

const
    // indicator = require('../algo/indicators'),
    executor = require('../algo/executor');


const testPrice = '0.1',
      testQty = '6',
      testTicker = 'edousd';

// describe('Array', function() {
//   describe('#indexOf()', function() {
//     it('should return -1 when the value is not present', function() {
//         [1,2,3].indexOf(4).should.equal(-1)
//     //   assert.equal(-1, [1,2,3].indexOf(4));
//     });
//   });
// });

const testInput = [81.59, 81.06, 82.87, 83, 83.61, 83.15, 82.84, 85, 87];

// describe('Indicators', () => {
//     describe('BB(input, 5, 2)', () => {
//         it('return lower, mid, and upper bollinger bands', () => {
//             var result = indicator.BB(testInput, 5, 1.5)
//             return expect(result).to.eventually.deep.equal({bb_lower: 82.0246, bb_upper: 86.6154})
//         })
//     })

//     describe('RSI(input, 5)', () => {
//         it('return rsi', () => {
//             var result = indicator.RSI(testInput, 5)
//             return expect(result).to.eventually.equal(87.71)
//         })
//     })

//     describe('BB & RSI Signals', () => {
//         it('return -10 as the sell signal', () => {
//             var result = indicator.calculateBB_RSI(testInput, 1.5, 5)
//             return expect(result).to.eventually.equal(-10)
//         })
//     })
// })

describe('Null Orders', () => {
    describe('Order Status', async () => {
        it('should return 404 status code', async () => {
            let res = await executor.getOrderById(12412).catch((res) => {
               expect(res.statusCode).to.equal(404);
            });
        })
    });
    describe('Cancel Order', async () => {
        it('should return 400 status code', async () => {
            let res = await executor.cancelOrderById(12412).catch((res) => {
                expect(res.statusCode).to.equal(400);
            });
        })
    })
})


describe.only('Order Submission', () => {
    describe.only('Limit Order', async () => {
        let orderId;
        it('should return true from response', async () => {
            let res = await executor.submitLimit(testTicker, testPrice, testQty, 'buy');
            res = await JSON.parse(res);
            orderId = res.id;
            expect(res.is_live).to.be.true;
        });        
    })

    // describe('Market Order', () => {
    //     it('should return true from the order status', async () => {
    //         let res = await executor.submitMarket(testTicker, testQty, 'sell');
    //         return expect(JSON.parse(res).is_live).to.be.true;
    //     });
    // })
})
// var str = 'string'
// console.log(str.should.be.a('string'));
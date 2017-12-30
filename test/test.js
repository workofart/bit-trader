require('./env-setup');


describe('First test', () => {
    it('should return a test string', () => {
        expect('test').to.equal('test');
    });
});


// const
    // indicator = require('../algo/indicators'),
    // executor = require('../algo/executor');


// const testPrice = '0.1',
//       testQty = '6',
//       testTicker = 'edousd';

// describe('Array', function() {
//   describe('#indexOf()', function() {
//     it('should return -1 when the value is not present', function() {
//         [1,2,3].indexOf(4).should.equal(-1)
//     //   assert.equal(-1, [1,2,3].indexOf(4));
//     });
//   });
// });

// const testInput = [81.59, 81.06, 82.87, 83, 83.61, 83.15, 82.84, 85, 87];


// describe('Null Orders', () => {
//     describe('Order Status', async () => {
//         it('should return 404 status code', async () => {
//             let res = await executor.getOrderById(12412).catch((res) => {
//                expect(res.statusCode).to.equal(404);
//             });
//         })
//     });
//     describe('Cancel Order', async () => {
//         it('should return 400 status code', async () => {
//             let res = await executor.cancelOrderById(12412).catch((res) => {
//                 expect(res.statusCode).to.equal(400);
//             });
//         })
//     })
// })


// describe.only('Order Submission', () => {
//     describe.only('Limit Order', async () => {
//         let orderId;
//         it('should return true from response', async () => {
//             let res = await executor.submitLimit(testTicker, testPrice, testQty, 'buy');
//             res = await JSON.parse(res);
//             orderId = res.id;
//             expect(res.is_live).to.be.true;
//         });
//     })

    // describe('Market Order', () => {
    //     it('should return true from the order status', async () => {
    //         let res = await executor.submitMarket(testTicker, testQty, 'sell');
    //         return expect(JSON.parse(res).is_live).to.be.true;
    //     });
    // })
// })

// var str = 'string'
// console.log(str.should.be.a('string'));
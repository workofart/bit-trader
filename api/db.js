const db = require('../db/config');
const moment = require('moment');
const Cursor = require('pg-cursor');

var tickerCursors = {};

var sendJsonResponse = function (res, status, content){
    res.status(status);
    res.json(content);
}

module.exports.getCandlePrice = function(req, res) {
    var ticker = req.params.ticker;
    var query = `SELECT * FROM BITFINEX_PRICE_CANDLE where ticker='${ticker}' order by timestamp desc limit 100;`
    db.pool.connect((err, client, done) => {
        if (err) throw err
        client.query(
            query, (err, result) => {
                
                if (err && err.code != 23505) {
                    console.log(err)
                    done(err)
                    sendJsonResponse(res, 500, 'Server error');
                }
                else {
                    sendJsonResponse(res, 200, result.rows);
                    done();
                }
            })
    })
}

module.exports.getTickerPrice = function(req, res) {
    var ticker = req.params.ticker;
    var query = `SELECT * FROM BITFINEX_PRICE_TICKER where ticker='${ticker}' order by timestamp desc limit 100;`
    db.pool.connect((err, client, done) => {
        if (err) throw err
        client.query(
            query, (err, result) => {
                
                if (err && err.code != 23505) {
                    console.log(err)
                    done(err)
                    sendJsonResponse(res, 500, 'Server error');
                }
                else {
                    done()
                    sendJsonResponse(res, 200, result.rows);
                }
            })
    })
}

module.exports.getBooks = function(req, res) {
    var ticker = req.params.ticker;
    var query = `SELECT * FROM BITFINEX_BOOKS where ticker='${ticker}' order by timestamp desc limit 100;`
    db.pool.connect((err, client, done) => {
        if (err) throw err
        client.query(
            query, (err, result) => {
                if (err && err.code != 23505) {
                    console.log(err)
                    done(err)
                    sendJsonResponse(res, 500, 'Server error');
                }
                else {
                    done()
                    sendJsonResponse(res, 200, result.rows);
                }
            })
    })
}

module.exports.insertCandlePrice = function(req, res) {
    // console.log(req.body)
    const {ticker, open, close, low, high, volume, timestamp} = req.body;
    var params = [ticker, open, close, low, high, volume, timestamp]
    var query = `INSERT INTO BITFINEX_PRICE_CANDLE (ticker, open, close, low, high, volume, timestamp) VALUES ($1, $2, $3, $4, $5, $6, $7);`
    console.log(timestamp + ': Inserted Candle Price')
    db.pool.connect((err, client, done) => {
        if (err) throw err
        client.query(
            query, params, (err, result) => {
                done()
                if (err && err.code != 23505) {
                    console.log(err)
                    sendJsonResponse(res, 500, 'Server error');
                }
                else {
                    sendJsonResponse(res, 200, 'Success');
                }
            })
    })
}

module.exports.insertTickerPrice = function(req, res) {
    // console.log(req.body)
    const {ticker, bid, bid_size, ask, ask_size,
           daily_change, daily_change_perc, last_price, low, high, volume} = req.body;
    const timestamp = moment().local().format('YYYY-MM-DD HH:mm:ss');
    console.log(timestamp + ': Inserted Ticker Price')
    var params = [ticker, bid, bid_size, ask, ask_size, 
                  daily_change, daily_change_perc, last_price, low, high, volume, timestamp]
    var query = `INSERT INTO BITFINEX_PRICE_TICKER (ticker, bid, 
                 bid_size, ask, ask_size, daily_change, daily_change_perc,
                 last_price, low, high, volume, timestamp) VALUES ($1, $2, $3, $4, $5, $6, $7,
                 $8, $9, $10, $11, $12);`
    db.pool.connect((err, client, done) => {
        if (err) throw err
        client.query(
            query, params, (err, result) => {
                done()
                if (err && err.code != 23505) {
                    console.log(err)
                    sendJsonResponse(res, 500, 'Server error');
                }
                else {
                    sendJsonResponse(res, 200, 'Success');
                }
            })
    })
}

module.exports.insertBooks = function(req, res) {
    // console.log(req.body)
    const {ticker, price, count, amount, timestamp} = req.body;
    var params = [ticker, price, count, amount, timestamp]
    var query = `INSERT INTO BITFINEX_BOOKS (ticker, price, count, amount, timestamp) VALUES ($1, $2, $3, $4, $5);`
    console.log(timestamp + ': Inserted Books')
    db.pool.connect((err, client, done) => {
        if (err) throw err
        client.query(
            query, params, (err, result) => {
                done()
                if (err && err.code != 23505) {
                    console.log(err)
                    sendJsonResponse(res, 500, 'Server error');
                }
                else {
                    sendJsonResponse(res, 200, 'Success');
                }
            })
    })
}

module.exports.getBotTrades = function(req, res) {
    var query = `SELECT * FROM BITFINEX_TRANSACTIONS WHERE TICKER='${req.params.ticker}';`;
    console.log(query)
    db.pool.connect((err, client, done) => {
        if (err) throw err
        client.query(
            query, (err, result) => {
                done();
                if (err && err.code != 23505) {
                    console.log(err)
                    sendJsonResponse(res, 500, 'Server error');
                }
                else {
                    console.log(`Returned [${result.rows.length}] bot trades`);
                    sendJsonResponse(res, 200, result.rows);
                }
            })
    })
}

module.exports.resetLivePriceFlag = function(req, res) {
    console.log('Resetting live price flag, reload prices')
    for (var ticker in tickerCursors) {
        tickerCursors[ticker] = undefined;
    }
    sendJsonResponse(res, 200, [])
}

// module.exports.getLivePrices = function(req, res) {
//     var ticker = req.params.ticker;
//     var query = `SELECT * FROM BITFINEX_LIVE_PRICE WHERE TICKER='${ticker}' ORDER BY TIMESTAMP;`;
//     console.log('getLivePrices api called')
//     if(tickerCursors[ticker] === -1) {
//         console.log('Nothing to load ' + ticker)
//         sendJsonResponse(res, 200, []);
//         return;
//     }
//     db.pool.connect((err, client, done) => {
//         if (tickerCursors[ticker] === undefined) {
//             console.log(`Started initial load for [${ticker}]`);
//             const cursor = client.query(new Cursor(query))
//             tickerCursors[ticker] = cursor;
//         }
//         // handle done
//         // else if(tickerCursors[ticker] === -1) {
//         //     console.log('Nothing to load ' + ticker)
//         //     sendJsonResponse(res, 200, []);
//         // }
//         if (tickerCursors[ticker] != -1) {
//             // console.log(tickerCursors);
//             tickerCursors[ticker].read(3000, (err, rows) => {
//                 done()
//                 if(err) {
//                     console.log(err);
//                     sendJsonResponse(res, 500, 'DB error');
//                     throw err;
//                 }
//                 if (rows.length > 0) {
//                     console.log(`Row count: ${rows.length}`)
//                     sendJsonResponse(res, 200, rows);
//                 }
//                 else {
//                     console.log(`All data finished loading for [${ticker}]`)
//                     sendJsonResponse(res, 200, []);
//                     tickerCursors[ticker] = -1;
//                     // tickerCursors[ticker].close((err) => {
//                     //     if (err) {
//                     //         console.log(err);
//                     //     }
//                     // });
//                 }
//             })
            
//         }
//     });
// }


module.exports.getLivePrices = function(req, res) {
    var ticker = req.params.ticker;
    var query = `SELECT * FROM BITFINEX_LIVE_PRICE WHERE TICKER='${ticker}' ORDER BY TIMESTAMP;`;
    console.log('getLivePrices api called: ' + query)
    db.pool.connect((err, client, done) => {
        if(err) {
            console.log(err);
            sendJsonResponse(res, 500, 'DB connection error');
            throw err;
        }
        client.query(query, (err, result) => {
            done()
            if(err) {
                console.log(err.stack);
                sendJsonResponse(res, 500, 'db query error');
            }
            else {
                var rows = result.rows;
                console.log(`Row count: ${rows.length}`)
                sendJsonResponse(res, 200, rows);
            }
        })
    });
}
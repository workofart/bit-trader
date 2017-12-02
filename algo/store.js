const db = require('../db/config');
const moment = require('moment');
const util = require('util');

exports.clearTable = (tableName) => {
    var query = `delete from ${tableName};`
    db.pool.connect((err, client, done) => {
        if (err) throw err
        client.query(
            query, (err, result) => {
                done()
                if (err && err.code != 23505) {
                    console.log(err)
                    console.err(`There was a error when clearing the ${tableName} table`)
                }
                else {
                    util.log(`Success clearing ${tableName} table`);
                }
            }
        )
    })
}

exports.storeTransactionToDB = (ticker, price, qty, side) => {
    var timestamp = moment().local().format('YYYY-MM-DD HH:mm:ss');
    var params = [ticker, price, qty, side, timestamp];
    var query = `INSERT INTO BITFINEX_TRANSACTIONS (ticker, price, qty, side, timestamp) VALUES ($1, $2, $3, $4, $5);`
    db.pool.connect((err, client, done) => {
        if (err) throw err
        client.query(
            query, params, (err, result) => {
                done()
                if (err && err.code != 23505) {
                    console.log(err)
                    console.err('There was a error when inserting into transactions table')
                }
                else {
                    util.log(`Store transaction | ${params[3] ? 'Bought' : 'Sold'} ${params[2]} [${params[0]}] @ ${params[1]}`)
                }
            })
    })
}

exports.storeLivePrice = (ticker, price, bid, bid_size, ask, ask_size, high, low, volume) => {
    var timestamp = moment().local().format('YYYY-MM-DD HH:mm:ss');
    var params = [ticker, price, bid, bid_size, ask, ask_size, high, low, volume, timestamp];
    var query = `INSERT INTO BITFINEX_LIVE_PRICE (ticker, price, bid, bid_size, ask, ask_size, high, low, volume, timestamp) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10);`
    db.pool.connect((err, client, done) => {
        if (err) throw err
        client.query(
            query, params, (err, result) => {
                done()
                if (err && err.code != 23505) {
                    console.log(err)
                    console.error('There was a error when inserting into live price table')
                }
                else {
                    util.log(`[${ticker}] price: $${price}`)
                }
            })
    })
}
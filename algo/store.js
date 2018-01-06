const db = require('../db/config');
const moment = require('moment');
const util = require('util');

exports.clearTable = (tableName) => {
    let query = `delete from ${tableName};`
    db.pool.connect((err, client, done) => {
        if (err) throw err
        client.query(
            query, (err, result) => {
                done()
                if (err && err.code !== 23505) {
                    util.error(err);
                    util.error(`There was a error when clearing the ${tableName} table`)
                }
                else {
                    util.log(`Success clearing ${tableName} table`);
                }
            }
        )
    })
}

exports.storeTransactionToDB = (ticker, price, qty, side, timestamp = moment().local().format('YYYY-MM-DD HH:mm:ss')) => {
    let params = [ticker, price, qty, side, timestamp];
    let query = `INSERT INTO BITFINEX_TRANSACTIONS (ticker, price, qty, side, timestamp) VALUES ($1, $2, $3, $4, $5);`;
    db.pool.connect((err, client, done) => {
        if (err) throw err;
        client.query(
            query, params, (err, result) => {
                done()
                if (err && err.code !== 23505) {
                    util.error(err);
                    util.error('There was an error when inserting into transactions table');
                }
                else {
                    // util.log(`Store transaction | ${params[3] ? 'Bought' : 'Sold'} ${params[2]} [${params[0]}] @ ${params[1]}`)
                }
            })
    })
}

exports.storeLivePrice = (ticker, price, bid, bid_size, ask, ask_size, high, low, volume, timestamp = moment().local().format('YYYY-MM-DD HH:mm:ss')) => {
    let params = [ticker, price, bid, bid_size, ask, ask_size, high, low, volume, timestamp];
    let query = `INSERT INTO BITFINEX_LIVE_PRICE (ticker, price, bid, bid_size, ask, ask_size, high, low, volume, timestamp) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10);`
    db.pool.connect((err, client, done) => {
        if (err) throw err
        client.query(
            query, params, (err, result) => {
                done()
                if (err && err.code !== 23505) {
                    util.error(err);
                    util.error('There was a error when inserting into live price table');
                }
                else {
                    util.log(`[${ticker}] price: $${price}`)
                }
            })
    })
}

exports.storeWallet = (balance, timestamp = moment().local().format('YYYY-MM-DD HH:mm:ss')) => {
    let params = [balance, timestamp];
    let query = `INSERT INTO bitfinex_live_wallet (balance, timestamp) VALUES ($1, $2);`;
    db.pool.connect((err, client, done) => {
        if (err) throw err;
        client.query(
            query, params, (err, result) => {
                done()
                if (err && err.code !== 23505) {
                    util.error(err);
                    util.error('There was a error when inserting into live wallet table');
                }
                else {
                    // util.log(`[${timestamp}] balance: $${price}`)
                }
            })
    })
}
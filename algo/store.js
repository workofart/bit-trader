const db = require('../db/config');
const copyTo = require('pg-copy-streams').to;
const path = require('path');
const moment = require('moment');
const util = require('util');

exports.clearTable = tableName => new Promise((resolve, reject) => {
    const query = `delete from ${tableName};`;
    db.pool.connect((err, client, done) => {
        if (err) throw err;
        client.query(query, (err, result) => {
            done();
            if (err && err.code !== 23505) {
                util.error(err);
                util.error(`There was a error when clearing the ${tableName} table`);
                reject(1);
            } else {
                util.log(`Success clearing ${tableName} table`);
                resolve(0);
            }
        });
    });
});

exports.storeTransactionToDB = (ticker, price, qty, side, timestamp = moment().local().format('YYYY-MM-DD HH:mm:ss')) => new Promise((resolve, reject) => {
    if (!global.isParamTune) {
        const params = [ticker, price, qty, side, timestamp];
        const query = 'INSERT INTO BINANCE_TRANSACTIONS (ticker, price, qty, side, timestamp) VALUES ($1, $2, $3, $4, $5);';
        db.pool.connect((err, client, done) => {
            if (err) throw err;
            client.query(query, params, (err, result) => {
                done();
                if (err && err.code !== 23505) {
                    util.error(err);
                    util.error('There was an error when inserting into transactions table');
                    reject(1);
                } else {
					resolve(0);
                    // util.log(`Store transaction | ${params[3] ? 'Bought' : 'Sold'} ${params[2]} [${params[0]}] @ ${params[1]}`)
                }
            });
        });
    }
    resolve(0);
});

exports.storeLivePrice = (data, timestamp = moment().local().format('YYYY-MM-DD HH:mm:ss')) => new Promise((resolve, reject) => {
    const {
        ticker, last_price, high, low, volume, rsi, bb_upper, bb_lower,
    } = data;
    const params = [ticker, last_price, high, low, volume, timestamp, rsi, bb_upper, bb_lower];
    const query = 'INSERT INTO BINANCE_LIVE_PRICE (ticker, price, high, low, volume, timestamp, rsi, bb_upper, bb_lower) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9);';
    db.pool.connect((err, client, done) => {
        if (err) throw err;
        client.query(query, params, (err, result) => {
            done();
            if (err && err.code !== 23505) {
                util.error(err);
                util.error('There was a error when inserting into live price table');
                reject(1);
            } else {
                !global.isBacktest && util.log(`[${ticker}] price: ${last_price} BTC`);
                resolve(0);
            }
        });
    });
});

exports.storeWalletState = (timestamp = moment().local().format('YYYY-MM-DD HH:mm:ss')) => new Promise((resolve, reject) => {
    	if (!global.isParamTune) {
        let currencyValue = 0;

        for (const i in global.currencyWallet) {
            currencyValue += global.currencyWallet[i].qty * global.latestPrice[i];
        }

        const totalValue = global.wallet + currencyValue;
        const params = [totalValue, timestamp];

        const query = 'INSERT INTO BINANCE_WALLET (balance, timestamp) VALUES ($1, $2);';
        if (!isNaN(totalValue)) {
            db.pool.connect((err, client, done) => {
                if (err) throw err;
                client.query(query, params, (err, result) => {
                    done();
                    if (err && err.code !== 23505) {
                        util.error(err);
                        util.error('There was a error when inserting into live wallet table');
                        reject(1);
                    } else {
                        util.log(`Stored Wallet State: ${totalValue.toFixed(6)}BTC`);
                        resolve(0);
                    }
                });
            });
        }
    } else {
    		resolve(0);
    }
});

exports.exportDBToCSV = () => new Promise((resolve, reject) => {
    const timestamp = moment().local().format('YYYYMMDD_HHmmss');
    const outputPath = path.join(__dirname, '..', 'test', 'data', `binance_${timestamp}.csv`);
    console.log(outputPath);

    db.pool.connect((err, client, done) => {
        if (err) console.error(err);
        const stream = client.query(copyTo(`COPY binance_live_price TO '${outputPath}' DELIMITER ',' CSV HEADER;`));
        stream.pipe(process.stdout);
        stream.on('end', () => {
            done();
            resolve(0);
        });
        stream.on('error', () => {
            console.error('There was an error exporting the DB to csv ');
            done();
            resolve(0);
        });
    });
});

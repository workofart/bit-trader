const db = require('../db/config');
const copyTo = require('pg-copy-streams').to;
const path = require('path');
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
    return new Promise((resolve, reject) => {
		if (!global.isParamTune) {
			let params = [ticker, price, qty, side, timestamp];
			let query = `INSERT INTO BINANCE_TRANSACTIONS (ticker, price, qty, side, timestamp) VALUES ($1, $2, $3, $4, $5);`;
			db.pool.connect((err, client, done) => {
				if (err) throw err;
				client.query(
					query, params, (err, result) => {
						done()
						if (err && err.code !== 23505) {
							util.error(err);
							util.error('There was an error when inserting into transactions table');
							reject(1);
						}
						else {
						    resolve(0);
							// util.log(`Store transaction | ${params[3] ? 'Bought' : 'Sold'} ${params[2]} [${params[0]}] @ ${params[1]}`)
						}
					})
			})
		}
		resolve(0);
    })

}

exports.storeLivePrice = (data, timestamp = moment().local().format('YYYY-MM-DD HH:mm:ss')) => {
    let {ticker, last_price, high, low, volume, rsi, bb_upper, bb_lower} = data;
    let params = [ticker, last_price, high, low, volume, timestamp, rsi, bb_upper, bb_lower];
    let query = `INSERT INTO BINANCE_LIVE_PRICE (ticker, price, high, low, volume, timestamp, rsi, bb_upper, bb_lower) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9);`;
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
                    !global.isBacktest && util.log(`[${ticker}] price: $${last_price}`)
                }
            })
    })
}

exports.storeWalletState = (timestamp = moment().local().format('YYYY-MM-DD HH:mm:ss')) => {
    return new Promise((resolve, reject) => {
    	if (!global.isParamTune) {
			let currencyValue = 0;

			for (let i in global.currencyWallet) {
				currencyValue += global.currencyWallet[i].qty * global.latestPrice[i]
			}

			let totalValue = global.wallet + currencyValue;
			let params = [totalValue, timestamp]

			let query = `INSERT INTO BINANCE_WALLET (balance, timestamp) VALUES ($1, $2);`;
			if (!isNaN(totalValue)) {
				db.pool.connect((err, client, done) => {
					if (err) throw err;
					client.query(
						query, params, (err, result) => {
							done();
							if (err && err.code !== 23505) {
								util.error(err);
								util.error('There was a error when inserting into live wallet table');
								reject(1);
							}
							else {
								util.log(`Stored Wallet State: ${totalValue.toFixed(6)}BTC`)
								resolve(0);
							}
						}
					)
				})
			}
		}
		else {
    		resolve(0);
		}
    })
}

exports.exportDBToCSV = () => {
	let timestamp = moment().local().format('YYYYMMDD_HHmmss');
	let outputPath = path.join(__dirname, '..', 'test', 'data', `binance_${timestamp}.csv`);
	console.log(outputPath);

	db.pool.connect(function(err, client, done) {
		if (err) console.error(err);
		var stream = client.query(copyTo(
			`COPY binance_live_price TO '${outputPath}' DELIMITER ',' CSV HEADER;`));
		stream.pipe(process.stdout);
		stream.on('end', done);
		stream.on('error', () => {
			console.error('There was an error exporting the DB to csv ');
			done();
		});

	});
}

// exports.storeWallet = (balance, timestamp = moment().local().format('YYYY-MM-DD HH:mm:ss')) => {
//     let params = [balance, timestamp];
//     let query = `INSERT INTO bitfinex_live_wallet (balance, timestamp) VALUES ($1, $2);`;
//     db.pool.connect((err, client, done) => {
//         if (err) throw err;
//         client.query(
//             query, params, (err, result) => {
//                 done()
//                 if (err && err.code !== 23505) {
//                     util.error(err);
//                     util.error('There was a error when inserting into live wallet table');
//                 }
//                 else {
//                     // util.log(`[${timestamp}] balance: $${price}`)
//                 }
//             })
//     })
// }
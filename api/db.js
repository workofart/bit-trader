const db = require('../db/config');
const moment = require('moment');
const Cursor = require('pg-cursor');

var tickerCursors = {};

var sendJsonResponse = function (res, status, content){
    res.status(status);
    res.json(content);
}

module.exports.getBotTradesByTicker = function(req, res) {
    var query = `SELECT * FROM BINANCE_TRANSACTIONS WHERE TICKER='${req.params.ticker}';`;
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

module.exports.getTradedTickers = function(req, res) {
    var query = `SELECT TICKER FROM BINANCE_TRANSACTIONS GROUP BY TICKER;`;
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

module.exports.getLivePrices = function(req, res) {
    var ticker = req.params.ticker;
    var query = `SELECT * FROM BINANCE_LIVE_PRICE WHERE TICKER='${ticker}' ORDER BY TIMESTAMP;`;
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

module.exports.getWalletState = function(req, res) {
	var query = `SELECT * FROM BINANCE_WALLET ORDER BY TIMESTAMP;`;
	console.log('getLiveWallet api called: ' + query);
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
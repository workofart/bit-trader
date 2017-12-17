const db = require('../../db/config'),
      util = require('util'),
      moment = require('moment'),
      _ = require('underscore'),
      {
        INITIAL_INVESTMENT, MAX_SCORE_INTERVAL, IS_BUY_IMMEDIATELY, STOP_LOSS
      } = require('../../algo/invest_constants'),
      Investment = require('../../algo/investment'),
      indicators = require('../../algo/indicators');

let tickerPrices = {},
    storedCounts = {};

let indicatorFlags = {
    ADX: true,
    RSI: true,
    DEMA_SMA_CROSS: true,
    PSAR: true
};

global.wallet = 600;
global.currencyWallet = {};
global.latestPrice = {};
global.storedWeightedSignalScore = {};

const fetchPrice = (ticker, count, callback) => {
    let query = `SELECT * FROM BITFINEX_LIVE_PRICE WHERE TICKER='${ticker}' ORDER BY TIMESTAMP LIMIT ${count};`;
    db.pool.connect((err, client, done) => {
        if(err) {
            console.log(err);
            util.err('DB connection error');
            throw err;
        }
        client.query(query, (err, result) => {
            done();
            if(err) {
                console.log(err.stack);
                util.err('DB query error');
            }
            else {
                let rows = result.rows;
                callback(rows);
            }
        })
    });
};

fetchPrice('BTCUSD', 100, (rows) => {
    for (let row of rows) {
        let {ticker, price, timestamp} = row;
        // console.log(`${timestamp} | ${ticker}: ${price}`);
        // util.log(row);
        let promise = processTickerPrice(ticker, row);
        promise.then((value) => {
            global.storedWeightedSignalScore[ticker] = value;
            if (storedCounts[ticker] >= MAX_SCORE_INTERVAL[ticker]) {
                // reset the signal score and counts
                util.log(`Resetting signal score for [${ticker}]`);
                global.storedWeightedSignalScore[ticker] = 0;
                storedCounts[ticker] = 0;
                MAX_SCORE_INTERVAL[ticker] = 40;
            }
            Investment.invest(global.storedWeightedSignalScore[ticker], ticker);
            storedCounts[ticker] += 1;
        }).catch((reason) => util.error(reason))
    }
});


let processTickerPrice = (ticker, data) => {


    let existingItem = _.find(tickerPrices[ticker], (item) => {
        return item.timestamp === data.timestamp
    });
    if (existingItem === undefined) {

        if (!Array.isArray(tickerPrices[ticker])) {
            tickerPrices[ticker] = []
        }

        tickerPrices[ticker].splice(_.sortedIndex(tickerPrices[ticker], data, 'timestamp'), 0, data)
    }
    util.log(tickerPrices[ticker]);
    let promise = computeIndicators(ticker, tickerPrices[ticker]);

    // Store the latest price into storage for investment decisions
    // util.log(`${ticker} : ${JSON.stringify(tickerPrices[ticker][tickerPrices[ticker].length - 1])}`)
    global.latestPrice[ticker] = tickerPrices[ticker][tickerPrices[ticker].length - 1].price;
    return promise;
}

function computeIndicators(ticker, data) {
    // var subscore = 0;

    let close = _.map(data, (item) => {
        return item.price;
    });

    // util.log(`[${ticker}] InputScore: ${processScore}`)
    indicators.initIndicators(indicatorFlags);

    console.log('[' + ticker + ']: ' + JSON.stringify(close));
    let promise = new Promise((resolve) => {
        indicators.calculateBB_RSI (close, 2).then((subscore) => {
            resolve(subscore);
        })
    });
    return promise;
}
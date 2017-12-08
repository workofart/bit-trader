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
    'ADX': true,
    'RSI': true,
    'DEMA_SMA_CROSS': true,
    'PSAR': true
};

global.wallet = 600;
global.currencyWallet = {};
global.latestPrice = {};
global.storedWeightedSignalScore = {};

const fetchPrice = (ticker, callback) => {
    var query = `SELECT * FROM BITFINEX_LIVE_PRICE WHERE TICKER='${ticker}' ORDER BY TIMESTAMP LIMIT 10;`;
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

fetchPrice('BTCUSD', (rows) => {
    for (var i in rows) {
        let {ticker, price, timestamp} = rows[i];
        console.log(`${timestamp} | ${ticker}: ${price}`);
        let promise = processTickerPrice(ticker, rows[i], global.storedWeightedSignalScore[ticker]);
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


let processTickerPrice = (ticker, data, subscore) => {
    // util.log(`[${ticker}] current score: ${subscore}`)
    let bid = data[0],
        bid_size = data[1],
        ask = data[2],
        ask_size = data[3],
        daily_change = data[4],
        daily_change_perc = data[5],
        last_price = data[6],
        volume = data[7],
        high = data[8],
        low = data[9];


    let processedData = {
        'ticker': ticker,
        'bid': bid,
        'bid_size': bid_size,
        'ask': ask,
        'ask_size': ask_size,
        'daily_change': daily_change,
        'daily_change_perc': daily_change_perc,
        'last_price': last_price,
        'volume': volume,
        'high': high,
        'low': low,
        'time': moment().local().format('YYYY-MM-DD HH:mm:ss')
    };

    let existingItem = _.find(tickerPrices[ticker], (item) => {
        return item.time === processedData.time
    });
    if (existingItem === undefined) {

        if (!Array.isArray(tickerPrices[ticker])) {
            tickerPrices[ticker] = []
        }

        tickerPrices[ticker].splice(_.sortedIndex(tickerPrices[ticker], processedData, 'time'), 0, processedData)
    }

    let promise = computeIndicators(ticker, tickerPrices[ticker], subscore);

    // Store the latest price into storage for investment decisions
    // util.log(`${ticker} : ${JSON.stringify(tickerPrices[ticker][tickerPrices[ticker].length - 1])}`)
    global.latestPrice[ticker] = tickerPrices[ticker][tickerPrices[ticker].length - 1].last_price;
    return promise;
}

function computeIndicators(ticker, data, processScore) {
    // var subscore = 0;

    let close = _.map(data, (item) => {
        return item.last_price;
    });

    // util.log(`[${ticker}] InputScore: ${processScore}`)
    indicators.initIndicators(indicatorFlags);

    // console.log('[' + ticker + ']: ' + JSON.stringify(close));
    let promise = new Promise((resolve) => {
        indicators.calculateBB_RSI (close, 2).then((subscore) => {
            resolve(subscore);
        })
    });
    return promise;
}
const db = require('../../db/config'),
      util = require('util'),
      _ = require('underscore'),
      {
        INITIAL_INVESTMENT, IS_BUY_IMMEDIATELY, STOP_LOSS
      } = require('../../algo/constants').investment,
      Investment = require('../../algo/investment'),
      TickerProcessor = require('../../algo/DataProcessors/ticker');
      indicators = require('../../algo/indicators'),
      testUtil = require('../lib/testUtil');


let tickerPrices = {},
    storedCounts = {},
    MAX_SCORE_INTERVAL = {};

let indicatorFlags = {
    ADX: true,
    RSI: true,
    DEMA_SMA_CROSS: true,
    PSAR: true
};

global.wallet = INITIAL_INVESTMENT;
global.currencyWallet = {};
global.latestPrice = {};
global.storedWeightedSignalScore = {};
global.isLive = false; // CAUTION, SETTING THIS TO TRUE WILL SUBMIT MARKET ORDERS $$$$$$
global.frozenTickers = {};

/**
 * Fetches price data from the database
 * @param ticker
 * @param count
 * @param callback
 * @returns {Promise<void>}
 */
const fetchPrice = async (ticker, count, callback) => {
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

// fetchPrice('BTCUSD', 17500, async (rows) => {
//     for (let row of rows) {
//         let {ticker, price, timestamp} = row;
//         initScoreCounts(ticker);
//
//         let score = await processTickerPrice(ticker, row);
//
//         // await util.log(`${ticker}: ${score}`);
//         global.storedWeightedSignalScore[ticker] = score;
//         if (storedCounts[ticker] >= MAX_SCORE_INTERVAL[ticker]) {
//             // reset the signal score and counts
//             // util.log(`Resetting signal score for [${ticker}]`);
//             global.storedWeightedSignalScore[ticker] = 0;
//             storedCounts[ticker] = 0;
//             MAX_SCORE_INTERVAL[ticker] = 40;
//         }
//         Investment.invest(global.storedWeightedSignalScore[ticker], ticker);
//         storedCounts[ticker] += 1;
//     }
// });


/**
 * This main processor takes in the prices and plays through chronologically
 * as if it was live data
 * @returns {Promise<void>}
 */
const processor = async (subprocessor) => {
    try {
        let data = await testUtil.parseCSV('live_price_down');
        data = _.sortBy(data, (a) => { return a.timestamp});
        for (i in data) {
            // console.log(`${data[i].timestamp} | ${data[i].ticker}`);
            data[i].last_price = parseFloat(data[i].price);
            delete data[i].price;
            let { ticker, price} = data[i];
            await subprocessor(ticker, data[i]);
        }
    }
    catch(e) {
        console.error('Problem with parsing the csv file: ' + e.stack);
    }

};

const processTickerPrice = async (ticker, data) => {
    initScoreCounts(ticker);
    try {
        let score = await tickerPriceIndicator(ticker, data);
        // util.log(`${ticker}: ${score}`);
        global.storedWeightedSignalScore[ticker] = score;
        if (storedCounts[ticker] >= MAX_SCORE_INTERVAL[ticker]) {
            // reset the signal score and counts
            // util.log(`Resetting signal score for [${ticker}]`);
            global.storedWeightedSignalScore[ticker] = 0;
            storedCounts[ticker] = 0;
            MAX_SCORE_INTERVAL[ticker] = 40;
        }
        Investment.invest(global.storedWeightedSignalScore[ticker], ticker);
        storedCounts[ticker] += 1;
    }
    catch(e) {
        console.error('There was a problem running the subprocessor: ' + e.stack);
    }
}

const tickerPriceIndicator = async (ticker, data) => {
    let existingItem = _.find(tickerPrices[ticker], (item) => {
        return item.timestamp === data.timestamp
    });
    if (existingItem === undefined) {

        if (!Array.isArray(tickerPrices[ticker])) {
            tickerPrices[ticker] = []
        }

        tickerPrices[ticker].splice(_.sortedIndex(tickerPrices[ticker], data, 'timestamp'), 0, data)
    }
    // Store the latest price into storage for investment decisions
    global.latestPrice[ticker] = tickerPrices[ticker][tickerPrices[ticker].length - 1].last_price;

    // util.log(tickerPrices[ticker]);

    // util.log(`${ticker} : ${JSON.stringify(tickerPrices[ticker][tickerPrices[ticker].length - 1])}`)
    return await TickerProcessor.computeIndicators(ticker, tickerPrices[ticker]);
}


processor(processTickerPrice);
// processor(indicators.processCorrelation);








const initScoreCounts = (ticker) => {
    global.storedWeightedSignalScore[ticker] = global.storedWeightedSignalScore[ticker] !== undefined ? global.storedWeightedSignalScore[ticker] : 0;
    MAX_SCORE_INTERVAL[ticker] = MAX_SCORE_INTERVAL[ticker] !== undefined ? MAX_SCORE_INTERVAL[ticker] : 40;
    storedCounts[ticker] = storedCounts[ticker] !== undefined ? storedCounts[ticker] : 0;
};
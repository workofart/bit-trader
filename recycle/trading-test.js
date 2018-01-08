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

const processTickerPrice = async (ticker, data) => {
    initScoreCounts(ticker);
    try {
        let score = await tickerPriceIndicator(ticker, data);
        // util.log(`${ticker}: ${score}`);
        global.storedWeightedSignalScore[ticker] = score;
        if (storedCounts[ticker] >= global.MAX_SCORE_INTERVAL[ticker]) {
            // reset the signal score and counts
            // util.log(`Resetting signal score for [${ticker}]`);
            global.storedWeightedSignalScore[ticker] = 0;
            storedCounts[ticker] = 0;
            global.MAX_SCORE_INTERVAL[ticker] = 40;
        }
        Investment.invest(global.storedWeightedSignalScore[ticker], ticker, data);
        storedCounts[ticker] += 1;
    }
    catch(e) {
        console.error('There was a problem running the subprocessor: ' + e.stack);
    }
}

const tickerPriceIndicator = async (ticker, data) => {

    if (!Array.isArray(tickerPrices[ticker])) {
        tickerPrices[ticker] = []
    }

    // let index = _.sortedIndex(tickerPrices[ticker], data, 'timestamp');
    // tickerPrices[ticker].splice(index, 0, data.last_price);
    tickerPrices[ticker].push(data.last_price);

    // Store the latest price into storage for investment decisions
    global.latestPrice[ticker] = tickerPrices[ticker][tickerPrices[ticker].length - 1];


    // util.log(`${ticker} : ${JSON.stringify(tickerPrices[ticker][tickerPrices[ticker].length - 1])}`)
    return await TickerProcessor.computeIndicators(ticker, tickerPrices[ticker], data.timestamp);
};

const initScoreCounts = (ticker) => {
    global.storedWeightedSignalScore[ticker] = global.storedWeightedSignalScore[ticker] !== undefined ? global.storedWeightedSignalScore[ticker] : 0;
    global.MAX_SCORE_INTERVAL[ticker] = global.MAX_SCORE_INTERVAL[ticker] !== undefined ? global.MAX_SCORE_INTERVAL[ticker] : 40;
    storedCounts[ticker] = storedCounts[ticker] !== undefined ? storedCounts[ticker] : 0;
};

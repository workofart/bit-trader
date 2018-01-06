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

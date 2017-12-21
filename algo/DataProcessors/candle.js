const moment = require('moment'),
      _ = require('underscore')
/***************************************************/
/*              Candle Functions                   */
/***************************************************/

module.exports.processCandles = (ticker, data) => {
    let timeStamp, open, close, high, low, volume;

    // Handle the first entry
    if (Array.isArray(data[1])) {
        // for (var i = 0; i < data.length; i++) {
        //     timeStamp = moment(data[i][0]).local().format('YYYY-MM-DD HH:mm:ss')
        //     open = data[i][1]
        //     close = data[i][2]
        //     high = data[i][3]
        //     low = data[i][4]
        //     volume = data[i][5]
        // }
        return new Promise((resolve) => {
            resolve([global.storedWeightedSignalScore[ticker],-1]);
        })
    }
    else {
        timeStamp = moment(data[0]).local().format('YYYY-MM-DD HH:mm:ss');
        open = data[1];
        close = data[2];
        high = data[3];
        low = data[4];
        volume = data[5];

        // var processedData = {
        //     'time' : timeStamp
        // }

        let processedData = {
            'time': timeStamp,
            'open': open,
            'close': close,
            'high': high,
            'low': low,
            'volume': volume,
            'ticker': ticker
        };

        // console.log(processedData)
        // console.log(_.sortedIndex(candles, processedData, 'time'))
        let existingItem = _.find(candles[ticker], (item) => {
            return item.time === processedData.time
        });
        if (existingItem === undefined) {

            if (!Array.isArray(candles[ticker])) {
                candles[ticker] = []
            }
            candles[ticker].splice(_.sortedIndex(candles[ticker], processedData, 'time'), 0, processedData)
            // console.log(candles)
        }
        // The latest data point might contain the same timestamp but a different price
        // Update the last item in the list with the current price
        else {
            let removedItem = candles[ticker].splice(_.sortedIndex(candles[ticker], processedData, 'time'), 1, processedData)
        }
        let close = _.map(candles[ticker], (item) => {
                return item.close;
            }),
            high = _.map(candles[ticker], (item) => {
                return item.high;
            }),
            low = _.map(candles[ticker], (item) => {
                return item.low;
            });

        return new Promise((resolve) => {
            indicators.calculatePSAR(high, low, close, global.storedWeightedSignalScore[ticker]).then((subscore) => {
                indicators.calculateADX(high, low, close, subscore).then((result) => {
                    resolve(result)
                })
            })
        })
    }
};


//     candlePromise.then((value) => {
//         // Calculate the two indicators
//         var subscore = value[0]
//         var trend = value[1]
//         // util.log(`Candle[${ticker} | subscore: ${subscore} | trend: ${trend}`)
//         global.storedWeightedSignalScore[ticker] = subscore

//         if (storedCounts[ticker] >= MAX_SCORE_INTERVAL[ticker]) {

//             // reset the signal score and counts
//             util.log(`Resetting signal score for [${ticker}]`)
//             global.storedWeightedSignalScore[ticker] = 0;
//             storedCounts[ticker] = 0;
//             MAX_SCORE_INTERVAL[ticker] = 40;
//         }

//         // Trend Strength check - dynamically adjust data collection interval
//         // util.log(`[${ticker}] trendStrength: ${trendStrength[ticker]}`)
//         if (trendStrength[ticker] > 50) {
//             MAX_SCORE_INTERVAL[ticker] = MAX_SCORE_INTERVAL[ticker] + 20
//             util.log(`[${ticker}] Strong strength, extending signal collection period: ${MAX_SCORE_INTERVAL[ticker]}`)
//         }
//         invest(global.storedWeightedSignalScore[ticker], ticker)
//         storedCounts[ticker] += 1;
//     })


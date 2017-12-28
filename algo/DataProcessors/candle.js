const moment = require('moment'),
      _ = require('underscore'),
      indicators = require('../indicators'),
      Investment = require('../investment');


let candles = {},
    storedCounts = {};
/***************************************************/
/*              Candle Functions                   */
/***************************************************/

module.exports.processCandles = async (ticker, data) => {
    try {
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
            return [global.storedWeightedSignalScore[ticker],-1]
        }
        else {
            let timeStamp, open, close, high, low, volume;
            timeStamp = moment(data[0]).local().format('YYYY-MM-DD HH:mm:ss');
            open = data[1];
            close = data[2];
            high = data[3];
            low = data[4];
            volume = data[5];

            let processedData = {
                'time': timeStamp,
                'open': open,
                'close': close,
                'high': high,
                'low': low,
                'volume': volume,
                'ticker': ticker
            };

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
            close = _.map(candles[ticker], (item) => {
                return item.close;
            });

            high = _.map(candles[ticker], (item) => {
                return item.high;
            });

            low = _.map(candles[ticker], (item) => {
                return item.low;
            });

            let subscore = await indicators.calculatePSAR(high, low, close, global.storedWeightedSignalScore[ticker]);
            let value = await indicators.calculateADX(high, low, close, subscore);


            // Calculate the two indicators
            subscore = value[0];
            let trend = value[1];
            //         // util.log(`Candle[${ticker} | subscore: ${subscore} | trend: ${trend}`)
            global.storedWeightedSignalScore[ticker] = subscore;

            if (storedCounts[ticker] >= MAX_SCORE_INTERVAL[ticker]) {

                // reset the signal score and counts
                util.log(`Resetting signal score for [${ticker}]`)
                global.storedWeightedSignalScore[ticker] = 0;
                storedCounts[ticker] = 0;
                MAX_SCORE_INTERVAL[ticker] = 40;
            }

            //         // Trend Strength check - dynamically adjust data collection interval
            //         // util.log(`[${ticker}] trendStrength: ${trendStrength[ticker]}`)
            if (trendStrength[ticker] > 50) {
                MAX_SCORE_INTERVAL[ticker] = MAX_SCORE_INTERVAL[ticker] + 20
                util.log(`[${ticker}] Strong strength, extending signal collection period: ${MAX_SCORE_INTERVAL[ticker]}`)
            }
            Investment.invest(global.storedWeightedSignalScore[ticker], ticker);
            storedCounts[ticker] += 1;

            return subscore
        }
    }
    catch(e) {
        console.error('There was a problem processing the candles: ' + e.stack);
    }

};


//     candlePromise.then((value) => {
//
//     })


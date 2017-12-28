const
    tulind = require('tulind'),
    util = require('util'),
    moment = require('moment'),
    _ = require('underscore'),
    ss = require('simple-statistics'),
    {
        RSI, ADX, ADX_STRONG_MULTIPLIER, ADX_WEAK_MULTIPLIER,
        SMA, DEMA, PSAR_STEP, PSAR_MAX, PSAR_BASE_SCORE, RSI_BASE_SCORE, DEMA_SMA_CROSS_SCORE,
        BB_STD_DEV
    } = require('./parameters'),
    TICKERS = [
        'BTCUSD', 'LTCUSD', 'ETHUSD', 'ETCUSD',
        'DSHUSD', 'IOTUSD', 'EOSUSD', 'OMGUSD',
        'BCHUSD'
    ];

let flag = {
        'ADX': true,
        'RSI': true,
        'DEMA_SMA_CROSS': true,
        'PSAR': true
    },
    priceArr = {}, // The maximum number of data points before making a decision then resetting all signal
    numTickerRecords,
    prevTimestamp = moment(),
    currentTimestamp = moment();

exports.initIndicators = (f) => {
    flag = f;
};

const calculateCorrelation = (priceArr1, priceArr2) => {
    return ss.sampleCorrelation(priceArr1, priceArr2);
}


exports.processCorrelation = (tickerBase, ticker, data) => {
    let timestamp = moment(data.timestamp);

    // round to the nearest 10th second
    let actualSeconds = timestamp.seconds(),
        roundedSeconds = 10 * Math.floor(actualSeconds / 10);

    timestamp = timestamp.seconds(roundedSeconds).format();
    prevTimestamp = currentTimestamp;
    currentTimestamp = timestamp;

    // keep track of current length of tickers and if timestamp moved on, and current
    // length is still not equal to 9, then remove the batch
    if (currentTimestamp !== prevTimestamp && numTickerRecords !== 9) {
        priceArr = _.omit(priceArr, prevTimestamp);
    }


    priceArr[timestamp] = priceArr[timestamp] === undefined ? {} : priceArr[timestamp];
    priceArr[timestamp][ticker] = data;
    // console.log(`${timestamp} | ${Object.keys(priceArr[timestamp]).length} tickers`);


    numTickerRecords = Object.keys(priceArr[timestamp]).length;

    if (Object.keys(priceArr).length === 45 && numTickerRecords === 9) {
        let basePriceArr = _.map(priceArr, (item) => {
            return parseFloat(item[tickerBase].last_price);
        });

        let corrArr = [];
        for (t of TICKERS) {
            // no point in calculating the correlation between itself
            if (t !== tickerBase) {
                let targetPriceArr = _.map(priceArr, (item) => {
                    return parseFloat(item[t].last_price);
                });
                if (targetPriceArr.length === basePriceArr.length) {
                    let result = calculateCorrelation(basePriceArr, targetPriceArr);
                    // console.log(`${t} & ${tickerBase}: ${result}`);
                    corrArr.push({corr: result, tickerTarget: t, tickerBase: tickerBase});
                }
            }
        }
        priceArr = {}; // reset everything
        util.log('Processing correlation for ' + corrArr);
        return corrArr;
    }

}

exports.calculateRSI = (close, subscore, ticker) => {
    if (close.length > RSI && flag.RSI) {
        return new Promise((resolve) => {
            tulind.indicators.rsi.indicator([close], [RSI], function (err, results) {
                let rsi = results[0];
                if ((subscore < 0 && rsi[rsi.length - 1].toFixed(4) < 30) ||
                    (subscore > 0 && rsi[rsi.length - 1].toFixed(4) > 70)) {
                    subscore = 0
                }

                util.log(`[${ticker}] RSI:${rsi[rsi.length - 1].toFixed(4)}`)
                subscore += rsi[rsi.length - 1].toFixed(4) < 30 ?
                    RSI_BASE_SCORE :
                    rsi[rsi.length - 1].toFixed(4) > 70 ?
                        -RSI_BASE_SCORE :
                        0
                // util.log(`RSI subscore: ${r}`)
                resolve(subscore);
            })
        })
    }
    return new Promise((resolve) => { resolve(subscore); });
}

exports.calculateDEMA_SMA_CROSS = (close, subscore) => {
    if (close.length > DEMA && flag.DEMA_SMA_CROSS) {
        let dema, sma;
        return new Promise((resolve) => {
            tulind.indicators.dema.indicator([close], [DEMA], function (err, results) {
                dema = results[0];

                tulind.indicators.sma.indicator([close], [SMA], function (err, results) {
                    sma = results[0];
                    // if dema and sma crossed
                    if (dema[dema.length - 2] < sma[sma.length - 2] &&
                        dema[dema.length - 1] >= sma[sma.length - 1]) {
                        subscore += DEMA_SMA_CROSS_SCORE
                    }
                    else if (dema[dema.length - 2] >= sma[sma.length - 2] &&
                        dema[dema.length - 1] < sma[sma.length - 1]) {
                        subscore -= DEMA_SMA_CROSS_SCORE
                    }
                    // util.log(`DEMA cross subscore: ${subscore}`)
                    resolve(subscore);
                });
            })
        })
    }
    return new Promise((resolve) => { resolve(subscore); });
}

exports.calculatePSAR = async (high, low, close, subscore) => {
    if (high.length > 1 && low.length > 1 && close.length > 1 && flag.PSAR) {
        try {
            let results = await tulind.indicators.psar.indicator([high, low], [PSAR_STEP, PSAR_MAX]);
            let psar = results[0];
            // util.log('PSAR: ' + psar[psar.length - 1].toFixed(4))
            subscore += psar[psar.length - 1].toFixed(4) > close[close.length - 1] ?
                -PSAR_BASE_SCORE :
                psar[psar.length - 1].toFixed(4) < close[close.length - 1] ?
                    PSAR_BASE_SCORE :
                    0
            // util.log(`PSAR subscore: ${subscore}`)
            return subscore;
        }
        catch (e) {
            util.error("An error while calculating the PSAR indicator: " + e.stack);
        }
    }
}

exports.calculateADX = async (high, low, close, subscore) => {
    let trendStrength = -1;
    if (high.length > 1 && low.length > 1 && close.length > 1 && flag.ADX) {
        let inputData = [high, low, close];
        // util.log(JSON.stringify(inputData))
        try {
            let results = await tulind.indicators.adx.indicator(inputData, [ADX]);
            let adx = results[0];
            // Strong trend
            if (adx[adx.length - 1] > 50) {
                subscore *= ADX_STRONG_MULTIPLIER;
            }
            else if (adx[adx.length - 1] < 20) {
                subscore *= ADX_WEAK_MULTIPLIER;
            }
            trendStrength = adx[adx.length - 1];
            // util.log(`ADX subscore: ${subscore}`)
            // util.log(`ADX results: ${JSON.stringify(results)}`)
            return [subscore, trendStrength];
        }
        catch(e) {
            util.error('An error while calculating ADX indicator:' + e.stack);
        }
    }
}

// Combines RSI and Bolinger Bands
exports.calculateBB_RSI = async (close, period = RSI) => {
    if (close.length > period && flag.RSI) {
        try {
            let rsi = await RSI_FUNC(close, [period]);
            let bb_score = await BB(close, period, BB_STD_DEV);
            let { bb_lower, bb_upper } = bb_score;
            // util.log(`low:${bb_lower} | high: ${bb_upper} | rsi: ${rsi}`)
            // Long position
            if (rsi > 0 && rsi < 25 && close[close.length - 1] <= bb_lower) {
                return 10;
            }
            // Short position
            else if (rsi > 60 || close[close.length - 1] >= bb_upper * 0.9) {
                return -10;
            }
            else {
                return 0;
            }
        }
        catch (e) {
            util.error('An error occurred when calculating RSI_BB indicators:' + e.stack)
        }
    }
}

const BB = async (close, period, stdDev = BB_STD_DEV) => {
        try {
            let results = await tulind.indicators.bbands.indicator([close], [period, stdDev]);
            let bb_lower = results[0][results[0].length - 1].toFixed(2),
                bb_mid = results[1][results[1].length - 1].toFixed(2),
                bb_upper = results[2][results[2].length - 1].toFixed(2);

            return { bb_lower: parseFloat(bb_lower), bb_upper: parseFloat(bb_upper) };
        }
        catch(e) {
            util.error('An error while calculating BB:' + e.stack);
        }
};


const RSI_FUNC = async (close, period) => {
    try {
        let results = await tulind.indicators.rsi.indicator([close], [period]);
        let rsi = results[0];
        return parseFloat(rsi[rsi.length - 1].toFixed(2));
    }
    catch(e) {
        console.error('An error while calculating RSI:' + e.stack)
    }
};

let ADX_FUNC = async (high, low, close, period) => {
    try {
        let results = await tulind.indicators.adx.indicator([high, low, close], [period]);
            let adx = results[0];
            return parseFloat((adx[adx.length - 1].toFixed(2)));
    }
    catch(e) {
        util.error('An error while calculating ADX indicator: ' + e.stack);
    }
};

exports.BB = BB;
exports.ADX = ADX_FUNC;
exports.RSI = RSI_FUNC;
exports.correlation = calculateCorrelation;
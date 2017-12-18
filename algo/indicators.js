const tulind = require('tulind');
const util = require('util');
const _ = require('underscore');
var flag = {
    'ADX': true,
    'RSI': true,
    'DEMA_SMA_CROSS': true,
    'PSAR': true
}
const {
        RSI, ADX, ADX_STRONG_MULTIPLIER, ADX_WEAK_MULTIPLIER,
    SMA, DEMA, PSAR_STEP, PSAR_MAX, PSAR_BASE_SCORE, RSI_BASE_SCORE, DEMA_SMA_CROSS_SCORE
    } = require('./parameters');

// console.log(`${RSI}, ${ADX}, ${ADX_STRONG_MULTIPLIER}, ${ADX_WEAK_MULTIPLIER},
// ${SMA}, ${DEMA}, ${PSAR_STEP}, ${PSAR_MAX}, ${PSAR_BASE_SCORE}, ${RSI_BASE_SCORE}, ${DEMA_SMA_CROSS_SCORE}`)
/************** Indicators Parameters **************/
// const RSI = 15;
// const ADX = 10;
// const ADX_STRONG_MULTIPLIER = 1.3;
// const ADX_WEAK_MULTIPLIER = 0.8;
// const SMA = 6;
// const DEMA = 26;
// const PSAR_STEP = 0.03;
// const PSAR_MAX = 0.2;
// const PSAR_BASE_SCORE = 2;
// const RSI_BASE_SCORE = 5;
// const DEMA_SMA_CROSS_SCORE = 3;

/***************************************************/

// util.log('------------------ Indicator Paramters ------------------')
// util.log(`\nRSI: ${RSI}\nADX: ${ADX}\nADX_STRONG_MULTIPLIER: ${ADX_STRONG_MULTIPLIER}\nADX_WEAK_MULTIPLIER: ${ADX_WEAK_MULTIPLIER}\nSMA: ${SMA}\nDEMA: ${DEMA}\nPSAR_STEP: ${PSAR_STEP}\nPSAR_MAX: ${PSAR_MAX}\nPSAR_BASE_SCORE: ${PSAR_BASE_SCORE}\nRSI_BASE_SCORE: ${RSI_BASE_SCORE}\nDEMA_SMA_CROSS_SCORE: ${DEMA_SMA_CROSS_SCORE}`)

exports.initIndicators = (flag) => {
    flag = flag;
}

exports.calculateRSI = (close, subscore, ticker) => {
    if (close.length > RSI && flag.RSI) {
        return new Promise((resolve) => {
            tulind.indicators.rsi.indicator([close], [RSI], function (err, results) {
                var rsi = results[0];
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
        var dema, sma;
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

exports.calculatePSAR = (high, low, close, subscore) => {
    if (high.length > 1 && low.length > 1 && close.length > 1 && flag.PSAR) {
        return new Promise((resolve) => {
            tulind.indicators.psar.indicator([high, low], [PSAR_STEP, PSAR_MAX], function (err, results) {
                var psar = results[0];
                // util.log('PSAR: ' + psar[psar.length - 1].toFixed(4))
                subscore += psar[psar.length - 1].toFixed(4) > close[close.length - 1] ?
                    -PSAR_BASE_SCORE :
                    psar[psar.length - 1].toFixed(4) < close[close.length - 1] ?
                        PSAR_BASE_SCORE :
                        0
                // util.log(`PSAR subscore: ${subscore}`)
                resolve(subscore);
            })
        })
    }
    return new Promise((resolve) => { resolve(subscore); });
}

exports.calculateADX = (high, low, close, subscore) => {
    var trendStrength = -1;
    if (high.length > 1 && low.length > 1 && close.length > 1 && flag.ADX) {
        var inputData = [high, low, close];
        // util.log(JSON.stringify(inputData))
        return new Promise((resolve) => {
            tulind.indicators.adx.indicator(inputData, [ADX], function (err, results) {
                var adx = results[0];
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
                resolve([subscore, trendStrength]);
            })
        })
    }
    return new Promise((resolve) => { resolve([subscore, trendStrength]); });
}

// Combines RSI and Bolinger Bands
exports.calculateBB_RSI = (close, std_length, period = RSI) => {
    if (close.length > period && flag.RSI) {
        return new Promise((resolve) => {
            RSI_FUNC(close, period).then((rsi) => {
                BB(close, period, std_length).then((value) => {
                    // if (value == 0) {
                    //     resolve(0);
                    // }
                    var { bb_lower, bb_upper } = value;
                    // util.log(`low:${bb_lower} | high: ${bb_upper} | rsi: ${rsi}`)
                    // Long position
                    if (rsi > 0 && rsi < 25 && close[close.length - 1] <= bb_lower) {
                        resolve(10)
                    }
                    // Short position
                    else if (rsi > 60 || close[close.length - 1] >= bb_upper * 0.9) {
                        resolve(-10)
                    }
                    else {
                        resolve(0)
                    }
                }).catch((reason) => {
                    console.log(reason);
                })
            })
        })
    }
    return new Promise((resolve) => { resolve(0); });
}

var BB = (close, period, std_length) => {
    return new Promise((resolve) => {
        tulind.indicators.bbands.indicator([close], [period, std_length], function (err, results) {
            var bb_lower = results[0][results[0].length - 1].toFixed(2);
            var bb_mid = results[1][results[1].length - 1].toFixed(2);
            var bb_upper = results[2][results[2].length - 1].toFixed(2);

            // console.log(`bb_lower ${bb_lower} | bb_mid ${bb_mid} | bb_upper ${bb_upper}`)
            resolve({ bb_lower: parseFloat(bb_lower), bb_upper: parseFloat(bb_upper) })
        })
    })
}

var RSI_FUNC = (close, period) => {
    return new Promise((resolve) => {
        tulind.indicators.rsi.indicator([close], [period], function (err, results) {
            var rsi = results[0];
            resolve(parseFloat(rsi[rsi.length - 1].toFixed(2)));
        })
    })
}

var ADX_FUNC = (high, low, close, period) => {
    return new Promise((resolve) => {
        tulind.indicators.adx.indicator([high, low, close], [period], (err, results) => {
            var adx = results[0];
            resolve(parseFloat((adx[adx.length - 1].toFixed(2))));
        })
    })
}
exports.BB = BB;
exports.ADX = ADX_FUNC;
exports.RSI = RSI_FUNC;
// if (Array.isArray(indicatorStorage.sma) && 
// Array.isArray(indicatorStorage.rsi) && 
// Array.isArray(indicatorStorage.dema) && 
// Array.isArray(indicatorStorage.psar)) {
// util.log(
//     `[${ticker}]: ${close[close.length - 1]} --- 
//     DEMA: ${indicators.dema[indicators.dema.length - 1].toFixed(4)} | 
//     RSI : ${indicators.rsi[indicators.rsi.length - 1].toFixed(4)} |
//     PSAR: ${indicators.psar[indicators.psar.length - 1].toFixed(4)}`)
// }
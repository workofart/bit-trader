const tulind = require('tulind');
const util = require('util');
var flag = {
    'ADX' : true,
    'RSI' : true,
    'DEMA_SMA_CROSS' : true,
    'PSAR' : true
}
const {
        RSI, ADX, ADX_STRONG_MULTIPLIER, ADX_WEAK_MULTIPLIER,
        SMA, DEMA, PSAR_STEP, PSAR_MAX, PSAR_BASE_SCORE, RSI_BASE_SCORE, DEMA_SMA_CROSS_SCORE
    } = require('./parameters');

console.log(`${RSI}, ${ADX}, ${ADX_STRONG_MULTIPLIER}, ${ADX_WEAK_MULTIPLIER},
${SMA}, ${DEMA}, ${PSAR_STEP}, ${PSAR_MAX}, ${PSAR_BASE_SCORE}, ${RSI_BASE_SCORE}, ${DEMA_SMA_CROSS_SCORE}`)
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

util.log('------------------ Indicator Paramters ------------------')
util.log(`\nRSI: ${RSI}\nADX: ${ADX}\nADX_STRONG_MULTIPLIER: ${ADX_STRONG_MULTIPLIER}\nADX_WEAK_MULTIPLIER: ${ADX_WEAK_MULTIPLIER}\nSMA: ${SMA}\nDEMA: ${DEMA}\nPSAR_STEP: ${PSAR_STEP}\nPSAR_MAX: ${PSAR_MAX}\nPSAR_BASE_SCORE: ${PSAR_BASE_SCORE}\nRSI_BASE_SCORE: ${RSI_BASE_SCORE}\nDEMA_SMA_CROSS_SCORE: ${DEMA_SMA_CROSS_SCORE}`)

exports.initIndicators = (flag) => {
    flag = flag;
}

exports.calculateRSI = (close, subscore) => {
    if (close.length > RSI && flag.RSI) {
        tulind.indicators.rsi.indicator([close], [RSI], function(err, results) {
            var rsi = results[0];
            subscore += rsi[rsi.length - 1].toFixed(4) < 0.3 ?
                        RSI_BASE_SCORE :
                        rsi[rsi.length - 1].toFixed(4) > 0.7 ?
                        -RSI_BASE_SCORE :
                        0
            return subscore;
        })
    }
    return subscore;
}

exports.calculateDEMA_SMA_CROSS = (close, subscore) => {
    if (close.length > DEMA && flag.DEMA_SMA_CROSS) {
        var dema, sma;
        tulind.indicators.dema.indicator([close], [DEMA], function(err, results) {
            dema = results[0];
            
            tulind.indicators.sma.indicator([close], [SMA], function(err, results) {
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
            });
            
        })

    }
    return subscore;
}

exports.calculatePSAR = (high, low, close, subscore) => {
    if (high.length > 1 && low.length > 1 && close.length > 1 && flag.PSAR) {
        tulind.indicators.psar.indicator([high, low], [PSAR_STEP, PSAR_MAX], function(err, results) {
            var psar = results[0];
            subscore += psar[psar.length - 1].toFixed(4) > close[close.length - 1] ?
                        PSAR_BASE_SCORE :
                        psar[psar.length - 1].toFixed(4) < close[close.length - 1] ?
                        -PSAR_BASE_SCORE :
                        0
                return subscore;
        })
    }
    return subscore;
}

exports.calculateADX = (high, low, close, subscore) => {
    trendStrength = -1;
    if (high.length > 1 && low.length > 1 && close.length > 1 && flag.ADX) {
        tulind.indicators.adx.indicator([high, low, close], [ADX], function(err, results) {
            var adx = results[0];
            // Strong trend
            if (adx[adx.length - 1] > 50) {
                subscore *= ADX_STRONG_MULTIPLIER;
            }
            else if (adx[adx.length - 1] < 20) {
                subscore *= ADX_WEAK_MULTIPLIER;
            }
            trendStrength = adx[adx.length - 1];
            return subscore;
        })
    }
    return subscore, trendStrength;
}

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
const indicators = require('../indicators');
const { invest } = require('../investment/investment'),
      db = require('../../algo/store');
const _ = require('underscore'),
      util = require('util'),
      moment = require('moment');

let storedCounts = {};


/***************************************************/
/*           Ticker Price Functions                */
/***************************************************/

const processTickerPrice = async (ticker, data) => {
    try {
        initScoreCounts(ticker);
        let processedData;

        processedData = global.isBacktest ? data : parseRawData(ticker, data);

        // console.log(processedData)

        if (!Array.isArray(global.tickerPrices[ticker])) {
            global.tickerPrices[ticker] = []
        }

        global.tickerPrices[ticker].push(processedData.last_price);
        global.latestPrice[ticker] = global.tickerPrices[ticker][global.tickerPrices[ticker].length - 1];

        if (global.tickerPrices[ticker].length > global.PURGE_LENGTH) {
            global.tickerPrices[ticker] = global.tickerPrices[ticker].slice(global.PURGE_LENGTH / 1.8);
        }
        if (global.isBacktest) {
            processedData.time = processedData.timestamp;
        }
        let obj = await computeIndicators(ticker, global.tickerPrices[ticker], processedData.time);
        let indicatorValue = obj ? obj.indicatorValue: 0;

        processedData.rsi = obj ? obj.rsi : 0;
        processedData.bb_lower = obj ? obj.bb_lower: 0;
        processedData.bb_upper = obj ? obj.bb_upper: 0;

        if (!global.isParamTune) {
            global.isBacktest ? db.storeLivePrice(processedData, processedData.timestamp) : db.storeLivePrice(processedData);
        }

        // Store the latest price into storage for investment decisions
        global.storedWeightedSignalScore[ticker] = indicatorValue;

        if (storedCounts[ticker] >= global.MAX_SCORE_INTERVAL[ticker]) {
            // reset the signal score and counts
            !global.isBacktest && util.log(`Resetting signal score for [${ticker}]`);
            resetScoreCount(ticker);
        }

        // util.log(`[${ticker}] RSI: ${indicatorValue}`);
        // processedData.timestamp = processedData.time;
        invest(global.storedWeightedSignalScore[ticker], ticker, processedData);
        storedCounts[ticker] += 1;
    }
    catch(e) {
        console.error('An error while processing ticker prices: ' + e.stack);
    }
};


const computeIndicators = async (ticker, data, timestamp) => {
    // get the current currency wallet and use them as the ticker base
    let openTickers = {};

    _.forEach(global.currencyWallet, (item) => {
        if (item.qty > 0) {
            let targetTicker = _.findKey(global.currencyWallet, (target) => {
                return target === item;
            });
            openTickers[targetTicker] = item;
        }
    });

    // indicators.initIndicators();

    for (let baseTicker of Object.keys(openTickers)) {
        let corr = await indicators.processCorrelation(baseTicker, ticker, data[data.length - 1], timestamp);
        _.forEach(corr, (i) => {
            global.frozenTickers[i.tickerTarget] = Math.abs(i.corr) > global.CORRELATION_THRESHOLD;
        })
    }
    // console.log(data);

    return await indicators.calculateBB_RSI(data);
};

const initScoreCounts = (ticker) => {
    global.storedWeightedSignalScore[ticker] = global.storedWeightedSignalScore[ticker] !== undefined ? global.storedWeightedSignalScore[ticker] : 0;
    global.MAX_SCORE_INTERVAL[ticker] = global.MAX_SCORE_INTERVAL[ticker] !== undefined ? global.MAX_SCORE_INTERVAL[ticker] : 40;
    storedCounts[ticker] = storedCounts[ticker] !== undefined ? storedCounts[ticker] : 0;
}

const resetScoreCount = (ticker) => {
    global.storedWeightedSignalScore[ticker] = 0;
    storedCounts[ticker] = 0;
    global.MAX_SCORE_INTERVAL[ticker] = 40;
}

const parseRawData = (ticker, data) => {
    let { volume, high, low, last_price } = data;

    return {
        ticker: ticker,
        last_price: last_price,
        volume: volume,
        high: high,
        low: low,
        timestamp: moment().local().format('YYYY-MM-DD HH:mm:ss')
    };
};

module.exports = {
    computeIndicators : computeIndicators,
    processTickerPrice: processTickerPrice,
    initScoreCount: initScoreCounts,
    resetScoreCount: resetScoreCount
}
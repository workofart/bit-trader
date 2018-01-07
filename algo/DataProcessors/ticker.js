const indicators = require('../indicators');
const { invest } = require('../investment'),
      db = require('../../algo/store');
const _ = require('underscore'),
      util = require('util'),
      moment = require('moment');

let storedCounts = {};


/***************************************************/
/*           Ticker Price Functions                */
/***************************************************/

const processTickerPrice = async (ticker, data) => {
    storedCounts[ticker] = storedCounts[ticker] !== undefined ? storedCounts[ticker] : 0;
    global.MAX_SCORE_INTERVAL[ticker] = global.MAX_SCORE_INTERVAL[ticker] !== undefined ? global.MAX_SCORE_INTERVAL[ticker] : 40;

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

    // console.log(processedData)
    let existingItem = _.find(global.tickerPrices[ticker], (item) => {
        return item.time === processedData.time
    });
    if (existingItem === undefined) {

        if (!Array.isArray(global.tickerPrices[ticker])) {
            global.tickerPrices[ticker] = []
        }
        db.storeLivePrice(ticker, last_price, bid, bid_size, ask, ask_size, high, low, volume);

        global.tickerPrices[ticker].splice(_.sortedIndex(global.tickerPrices[ticker], processedData, 'time'), 0, processedData)
    }

    try {
        let indicatorValue = await computeIndicators(ticker, global.tickerPrices[ticker], processedData.time);

        // Store the latest price into storage for investment decisions
        global.latestPrice[ticker] = global.tickerPrices[ticker][global.tickerPrices[ticker].length - 1].last_price;

        global.storedWeightedSignalScore[ticker] = indicatorValue;
        // util.log(`${ticker} count: ${storedCounts[ticker]}`)
        // util.log(`[${ticker} | Weighted Signal Score: ${value.toFixed(4)}\n`)
        if (storedCounts[ticker] >= global.MAX_SCORE_INTERVAL[ticker]) {
            // if (global.storedWeightedSignalScore[ticker] != 0 && global.storedWeightedSignalScore[ticker] != Infinity) {
            //     util.log('------------------------------------------------\n\n')
            //     util.log(`[${ticker} | Weighted Signal Score: ${global.storedWeightedSignalScore[ticker].toFixed(4)}\n`)
            //     invest(global.storedWeightedSignalScore[ticker], ticker)
            // }
            // reset the signal score and counts
            util.log(`Resetting signal score for [${ticker}]`);
            global.storedWeightedSignalScore[ticker] = 0;
            storedCounts[ticker] = 0;
            global.MAX_SCORE_INTERVAL[ticker] = 40;
        }
        // util.log(`[${ticker}] RSI: ${indicatorValue}`);
        processedData.timestamp = processedData.time;
        invest(global.storedWeightedSignalScore[ticker], ticker, processedData);
        storedCounts[ticker] += 1;
    }
    catch(e) {
        console.error('An error while processing ticker prices: ' + e.stack);
    }
}


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

    let close = _.map(data, (item) => {
        return item.last_price;
    });

    // util.log(`[${ticker}] InputScore: ${processScore}`)
    // indicators.initIndicators();


    for (let baseTicker of Object.keys(openTickers)) {
        let corr = await indicators.processCorrelation(baseTicker, ticker, data[data.length - 1].last_price, timestamp);
        _.forEach(corr, (i) => {
            global.frozenTickers[i.tickerTarget] = Math.abs(i.corr) > 0.75;
        })
    }
    // console.log(data);

    return await indicators.calculateBB_RSI(close);
    // return await indicators.calculateBB_RSI(data);
};

module.exports = {
    computeIndicators : computeIndicators,
    processTickerPrice: processTickerPrice
}
const indicators = require('../indicators');
const { invest } = require('../investment');
/***************************************************/
/*           Ticker Price Functions                */
/***************************************************/

module.exports.processTickerPrice = async (ticker, data, subscore, tickerPrices) => {
    // util.log(`[${ticker}] current score: ${subscore}`)
    let ticker = ticker,
        bid = data[0],
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
    let existingItem = _.find(tickerPrices[ticker], (item) => {
        return item.time === processedData.time
    });
    if (existingItem === undefined) {

        if (!Array.isArray(tickerPrices[ticker])) {
            tickerPrices[ticker] = []
        }
        db.storeLivePrice(ticker, last_price, bid, bid_size, ask, ask_size, high, low, volume)
        if (clientWS !== undefined && !isClientDead) {
            console.log('Sending price data to client through websocket....');
            clientWS.send(JSON.stringify({
                'ticker': ticker,
                'price': last_price,
                'bid': bid,
                'bid_size': bid_size,
                'ask': ask,
                'ask_size': ask_size,
                'high': high,
                'low': low,
                'volume': volume,
                'time': moment().local().format('YYYY-MM-DD HH:mm:ss')
            }))
        }
        tickerPrices[ticker].splice(_.sortedIndex(tickerPrices[ticker], processedData, 'time'), 0, processedData)
    }

    let indicatorValue = await computeIndicators(ticker, tickerPrices[ticker], subscore);

    // Store the latest price into storage for investment decisions
    // util.log(`${ticker} : ${JSON.stringify(tickerPrices[ticker][tickerPrices[ticker].length - 1])}`)
    global.latestPrice[ticker] = tickerPrices[ticker][tickerPrices[ticker].length - 1].last_price;

    try {
        global.storedWeightedSignalScore[ticker] = indicatorValue;
        // util.log(`${ticker} count: ${storedCounts[ticker]}`)
        // util.log(`[${ticker} | Weighted Signal Score: ${value.toFixed(4)}\n`)
        if (storedCounts[ticker] >= MAX_SCORE_INTERVAL[ticker]) {
            // if (global.storedWeightedSignalScore[ticker] != 0 && global.storedWeightedSignalScore[ticker] != Infinity) {
            //     util.log('------------------------------------------------\n\n')
            //     util.log(`[${ticker} | Weighted Signal Score: ${global.storedWeightedSignalScore[ticker].toFixed(4)}\n`)
            //     invest(global.storedWeightedSignalScore[ticker], ticker)
            // }
            // reset the signal score and counts
            util.log(`Resetting signal score for [${ticker}]`);
            global.storedWeightedSignalScore[ticker] = 0;
            storedCounts[ticker] = 0;
            MAX_SCORE_INTERVAL[ticker] = 40;
        }
        // util.log(`[${ticker}] RSI: ${value}`)
        invest(global.storedWeightedSignalScore[ticker], ticker);
        storedCounts[ticker] += 1;
    }
    catch(e) {
        console.error('An error while processing ticker prices: ' + e);
    }
}


async function computeIndicators(ticker, data, processScore) {
    // var subscore = 0;

    let close = _.map(data, (item) => {
        return item.last_price;
    });

    // util.log(`[${ticker}] InputScore: ${processScore}`)
    indicators.initIndicators(indicatorFlags);

    // console.log('[' + ticker + ']: ' + JSON.stringify(close));

    return await indicators.calculateBB_RSI(close);
}
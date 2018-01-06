const db = require('../../db/config'),
      util = require('util'),
      fs = require('fs'),
      moment = require('moment'),
      init = require('../../algo/init/init'),
      dbExecutor = require('../../algo/store'),
      customUtil = require('../../algo/custom_util'),
      gridSearch = require('../lib/grid_search'),
      _ = require('underscore'),
      Investment = require('../../algo/investment'),
      TickerProcessor = require('../../algo/DataProcessors/ticker');
      indicators = require('../../algo/indicators'),
      testUtil = require('../lib/testUtil'),
      clusterManager = require('./clusterManager');

const currentTime = moment().local().format('YYYY-MM-DD_HHmmss').toString();

require('../../algo/init/init');

let tickerPrices = {},
    storedCounts = {};

let indicatorFlags = {
    ADX: true,
    RSI: true,
    DEMA_SMA_CROSS: true,
    PSAR: true
};

global.isLive = false; // CAUTION, SETTING THIS TO TRUE WILL SUBMIT MARKET ORDERS $$$$$$


/**
 * This main processor takes in the prices and plays through chronologically
 * as if it was live data
 * @returns {Promise<void>}
 */
const processor = async (subprocessor, dataFile) => {
    console.time(`-- [${dataFile}] --`);
    try {
        let counter = 0;
        let data = await testUtil.parseCSV(dataFile);
        data = _.sortBy(data, (a) => { return a.timestamp});
        for (i in data) {
            // console.log(`${data[i].timestamp} | ${data[i].ticker}`);
            data[i].last_price = parseFloat(data[i].price);
            delete data[i].price;
            let { ticker, last_price, bid, bid_size, ask, ask_size, high, low, volume, timestamp } = data[i];
            // dbExecutor.storeLivePrice(ticker, last_price, bid, bid_size, ask, ask_size, high, low, volume, timestamp);
            // dbExecutor.storeWallet(global.wallet, timestamp);
            await subprocessor(ticker, data[i]);

            // if (counter === 240) {
            //     customUtil.printPNL();
            //     // customUtil.printWalletStatus();
            //     counter = 0;
            // }
            // counter++;
        }
        let profit = customUtil.printBacktestSummary();
        resetVariables();
        console.timeEnd(`-- [${dataFile}] --`);
        return profit;
        // customUtil.printWalletStatus();
    }
    catch(e) {
        console.error('Problem with parsing the csv file: ' + e.stack);
    }

};

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


const resetVariables = () => {
    global.wallet = global.INITIAL_INVESTMENT;
    global.currencyWallet = {};
    global.latestPrice = {};
    global.storedWeightedSignalScore = {};
    global.isLive = false; // CAUTION, SETTING THIS TO TRUE WILL SUBMIT MARKET ORDERS $$$$$$
    global.frozenTickers = {};
    global.MAX_SCORE_INTERVAL = {};

    close = {};
    storedCounts = {};
    tickerPrices = {};
};

const performGS = async () => {
    try {
        let options = {
            params: {
                DATA: ['live_price_sideway', 'live_price_up'],
                CORRELATION: [30],
                PROFIT: [0.01, 0.012],
                INVEST: [0.08],
                REPEAT_BUY: [0.2, 0.025],
                REPEAT_SELL: [0.02, 0.025],
                BEAR_LOSS: [0.02, 0.04],
                RSI: [41]
                // DATA: ['live_price_down', 'live_price_up', 'live_price_sideway'],
                // CORRELATION: [30, 45, 60],
                // PROFIT: [0.08, 0.01, 0.012],
                // INVEST: [0.08, 0.15, 0.2],
                // REPEAT_BUY: [0.02, 0.025, 0.03],
                // REPEAT_SELL: [0.02, 0.025, 0.03],
                // BEAR_LOSS: [0.02, 0.04],
                // RSI: [31, 41]
            },
            run_callback: async (comb) => {
                global.CORRELATION_PERIOD = comb.CORRELATION;
                global.MIN_PROFIT_PERCENTAGE = comb.PROFIT;
                global.INVEST_PERCENTAGE = comb.INVEST;
                global.REPEATED_BUY_MARGIN = comb.REPEAT_BUY;
                global.REPEATED_SELL_MARGIN = comb.REPEAT_SELL;
                global.BEAR_LOSS_START = comb.BEAR_LOSS;
                global.RSI = comb.RSI;

                let pnl = await processor(processTickerPrice, comb.DATA);

                // return the result - shape and content don't matter
                return { pnl: pnl};
            }
        };
        let grid_search = new gridSearch.GridSearch(options);
        await grid_search.run();
        await grid_search.displayTableOfResults(
            ['DATA'],
            ["CORRELATION", "PROFIT", "INVEST", "REPEAT_BUY", "REPEAT_SELL", "BEAR_LOSS", "RSI"],
            x => +(x.results.pnl)   // this callback needs to return single number for each result
        );
    }
    catch(e) {
        console.error('Error while grid searching: ' + e.stack);
    }

}

(
    async () => {
        // dbExecutor.clearTable('bitfinex_transactions');
        // dbExecutor.clearTable('bitfinex_live_price');
        // dbExecutor.clearTable('bitfinex_live_wallet');

        // await processor(processTickerPrice, 'live_price_down_3');
        // await processor(processTickerPrice, 'live_price_down_2');
        // await processor(processTickerPrice, 'live_price_down');
        // await processor(processTickerPrice, 'live_price_sideway');

        // let logfile = `../logs/test_${currentTime}.log`;
        // console.log(logfile)
        // let openFileStream_bot = fs.createWriteStream(logfile, {flags: 'a'});
        // openFileStream_bot.on('open', () => {
        //     process.stdout.pipe(openFileStream_bot);
        //     process.stderr.pipe(openFileStream_bot);
        // })
        await performGS();

        // Create symbolic link for easy log scanning
        // fs.symlinkSync(`bot_${currentTime}.log`, '../logs/stdout_bk');
        // fs.renameSync('../logs/stdout_bk', '../logs/stdout');
    }
)();

// clusterManager.initCluster(() => {
//     try {
//         processor(processTickerPrice)
//     }
//     catch(e) {
//         console.error(e.stack)
//     }
//
// });
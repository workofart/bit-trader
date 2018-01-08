const db = require('../../db/config'),
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
global.isBacktest = true;
global.isParamTune = true;


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
        // for (i in data) {
        for (var i = 0, len = data.length; i < len; i++) {
            // console.log(`${data[i].timestamp} | ${data[i].ticker}`);
            data[i].last_price = parseFloat(data[i].price);
            delete data[i].price;
            let { ticker, last_price, bid, bid_size, ask, ask_size, high, low, volume, timestamp } = data[i];
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

const resetVariables = () => {
    global.wallet = global.INITIAL_INVESTMENT;
    global.currencyWallet = {};
    global.latestPrice = {};
    global.storedWeightedSignalScore = {};
    global.isLive = false; // CAUTION, SETTING THIS TO TRUE WILL SUBMIT MARKET ORDERS $$$$$$
    global.frozenTickers = {};
    global.MAX_SCORE_INTERVAL = {};
    global.tickerPrices = {};

    close = {};
    storedCounts = {};
};

const performGS = async () => {
    try {
        let options = {
            params: {
                DATA: ['live_price_down', 'live_price_up', 'live_price_sideway'],
                CORRELATION: [30],
                PROFIT: [0.01, 0.012],
                INVEST: [0.12, 0.15],
                REPEAT_BUY: [0.025],
                REPEAT_SELL: [0.01],
                BEAR_LOSS: [0.02],
                RSI: [41],
                // DATA: ['live_price_down', 'live_price_up', 'live_price_sideway'],
                // CORRELATION: [30, 45, 60],
                // PROFIT: [0.008, 0.01, 0.012],
                // INVEST: [0.12, 0.15],
                // REPEAT_BUY: [0.02, 0.025, 0.03],
                // REPEAT_SELL: [0.01, 0.015, 0.02],
                // BEAR_LOSS: [0.02, 0.04]
                // RSI: [31, 41]
                LOWER_RSI: [20, 22, 25],
                BB_STD_DEV: [1.5, 1.75, 2]
            },
            run_callback: async (comb) => {
                global.CORRELATION_PERIOD = comb.CORRELATION;
                global.MIN_PROFIT_PERCENTAGE = comb.PROFIT;
                global.INVEST_PERCENTAGE = comb.INVEST;
                global.REPEATED_BUY_MARGIN = comb.REPEAT_BUY;
                global.REPEATED_SELL_MARGIN = comb.REPEAT_SELL;
                global.BEAR_LOSS_START = comb.BEAR_LOSS;
                global.RSI = comb.RSI;
                global.LOWER_RSI = comb.LOWER_RSI;
                global.BB_STD_DEV = comb.BB_STD_DEV;

                // let pnl = await processor(TickerProcessor.processTickerPrice(ticker, data), comb.DATA);
                let pnl = await processor(TickerProcessor.processTickerPrice, comb.DATA);

                // return the result - shape and content don't matter
                return { pnl: pnl};
            }
        };
        let grid_search = new gridSearch.GridSearch(options);
        await grid_search.run();
        await grid_search.displayTableOfResults(
            ['DATA'],
            ["CORRELATION", "PROFIT", "INVEST", "REPEAT_BUY", "REPEAT_SELL", "BEAR_LOSS", "RSI", "LOWER_RSI", "BB_STD_DEV"],
            x => +(x.results.pnl)   // this callback needs to return single number for each result
        );
    }
    catch(e) {
        console.error('Error while grid searching: ' + e.stack);
    }

}

(
    async () => {
        dbExecutor.clearTable('bitfinex_transactions');
        dbExecutor.clearTable('bitfinex_live_price');
        // dbExecutor.clearTable('bitfinex_live_wallet');
        // await processor(processTickerPrice, 'live_price_down_3');
        // await processor(processTickerPrice, 'live_price_down_2');
        // await processor(processTickerPrice, 'live_price_down');
        // await processor(TickerProcessor.processTickerPrice, 'live_price_sideway');
        // await processor(TickerProcessor.processTickerPrice, 'live_price_up');

        await performGS();
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
const moment = require('moment'),
init = require('../../algo/init/init'),
dbExecutor = require('../../algo/store'),
customUtil = require('../../algo/custom_util'),
gridSearch = require('../lib/grid_search'),
mapping = require('../../websockets/mapping_binance'),
_ = require('underscore'),
Investment = require('../../algo/investment/investment'),
InvestmentUtils = require('../../algo/investment/investmentUtils'),
TickerProcessor = require('../../algo/DataProcessors/ticker');
indicators = require('../../algo/indicators'),
testUtil = require('../lib/testUtil');

const currentTime = moment().local().format('YYYY-MM-DD_HHmmss').toString();

require('../../algo/init/init');

let tickerPrices = {},
    storedCounts = {};

const indicatorFlags = {
    ADX: true,
    RSI: true,
    DEMA_SMA_CROSS: true,
    PSAR: true,
};

global.isLive = false; // CAUTION, SETTING THIS TO TRUE WILL SUBMIT MARKET ORDERS $$$$$$
global.isBacktest = true;
global.isParamTune = false;


/**
 * This main processor takes in the prices and plays through chronologically
 * as if it was live data
 * @returns {Promise<void>}
 */
const processor = async (subprocessor, dataFile) => {
    console.time(`-- [${dataFile}] --`);

    try {
        const counter = 0;
        let data = await testUtil.parseCSV(dataFile);
        data = _.sortBy(data, a => a.timestamp);
        // let pnl = (parseFloat(data[data.length - 1].price) - parseFloat(data[0].price) / parseFloat(data[0].price) * 100).toFixed(2);
        // console.log(`B&H: ${pnl}%`);
        // dbExecutor.storeWalletState(data[0].timestamp);
        for (let i = 0, len = data.length; i < len; i++) {
            // console.log(`${data[i].timestamp} | ${data[i].ticker}`);
            data[i].last_price = parseFloat(data[i].price);
            delete data[i].price;
            delete data[i].rsi;
            delete data[i].bb_lower;
            delete data[i].bb_upper;
            const {
                ticker, last_price, high, low, volume, timestamp,
            } = data[i];
            // dbExecutor.storeWallet(global.wallet, timestamp);
            await subprocessor(ticker, data[i]);
        }
        // let profit = customUtil.printPNL();
        const profit = customUtil.printBacktestSummary();
        // console.log(JSON.stringify(global.currencyWallet, null, 2));
        resetVariables();
        console.timeEnd(`-- [${dataFile}] --`);
        return profit;
        // customUtil.printWalletStatus();
    } catch (e) {
        console.error(`Problem with parsing the csv file: ${e.stack}`);
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
        const options = {
            params: {
                DATA: [
                    'binance_sideway' // ../data/[filename].csv
                ],
                CORRELATION: [30],
                PROFIT: [0.004, 0.006, 0.008, 0.01],
                INVEST: [0.01, 0.008],
                REPEAT_BUY: [0.02, 0.025],
                BEAR_LOSS: [0.02, 0.025],
                RSI: [29],
                UPPER_RSI: [60, 65],
                LOWER_RSI: [40, 45],
                BB_STD_DEV: [2],
                LOW_RSI_OFFSET: [5],
                LOW_BB_OFFSET: [0.95],
                UP_STOP_LIMIT: [0.002],
                DOWN_STOP_LIMIT: [0.002]
            },
            run_callback: async (comb) => {
                global.CORRELATION_PERIOD = comb.CORRELATION;
                global.MIN_PROFIT_PERCENTAGE = comb.PROFIT;
                global.INVEST_PERCENTAGE = comb.INVEST;
                global.REPEATED_BUY_MARGIN = comb.REPEAT_BUY;
                global.BEAR_LOSS_START = comb.BEAR_LOSS;
                global.RSI = comb.RSI;
                global.UPPER_RSI = comb.UPPER_RSI;
                global.LOWER_RSI = comb.LOWER_RSI;
                global.BB_STD_DEV = comb.BB_STD_DEV;
                global.LOW_RSI_OFFSET = comb.LOW_RSI_OFFSET;
                global.LOW_BB_OFFSET = comb.LOW_BB_OFFSET;
                global.UP_STOP_LIMIT = comb.UP_STOP_LIMIT;
                global.DOWN_STOP_LIMIT = comb.DOWN_STOP_LIMIT;

                const pnl = await processor(TickerProcessor.processTickerPrice, comb.DATA);

                // return the result - shape and content don't matter
                return { pnl };
            },
        };
        const grid_search = new gridSearch.GridSearch(options);
        await grid_search.run();
        await grid_search.displayTableOfResults(
            ['DATA'],
            [
                'CORRELATION', 'PROFIT', 'INVEST', 'REPEAT_BUY', 'BEAR_LOSS', 'RSI',
                'UPPER_RSI', 'LOWER_RSI', 'BB_STD_DEV', 'LOW_RSI_OFFSET', 'LOW_BB_OFFSET',
                'UP_STOP_LIMIT', 'DOWN_STOP_LIMIT',
            ],
            x => +(x.results.pnl), // this callback needs to return single number for each result
        );
    } catch (e) {
        console.error(`Error while grid searching: ${e.stack}`);
    }
};

(
    async () => {
        if (global.isParamTune) {
            // Perform grid search parameter-tuning
            await performGS();
        }

        else {
            await dbExecutor.clearTable('binance_transactions');
			await dbExecutor.clearTable('binance_live_price');
            await dbExecutor.clearTable('binance_wallet');
            /* Example of simulating an intermediary state
             * InvestmentUtils.setupCurrencyWallet('XMRUSD');
             * global.currencyWallet.XMRUSD.qty = 0.42;
             * global.currencyWallet.XMRUSD.price = 330.42;
            */
            await processor(TickerProcessor.processTickerPrice, 'binance_down');
        }
    }
)();

/**
 * This init file sets the constant parameters to the global variables,
 * making it easier for backtesting to overwrite any parameter through
 * changing the global values
 */
const {
        RSI, ADX, ADX_STRONG_MULTIPLIER, ADX_WEAK_MULTIPLIER,
        SMA, DEMA, PSAR_STEP, PSAR_MAX, PSAR_BASE_SCORE, RSI_BASE_SCORE, DEMA_SMA_CROSS_SCORE,
        BB_STD_DEV, LOWER_RSI, UPPER_RSI, CORRELATION_PERIOD,
    } = require('./parameters'),
    {
        INITIAL_INVESTMENT, INVEST_PERCENTAGE,
        MIN_PROFIT_PERCENTAGE, TRADING_FEE,
        BUY_SIGNAL_TRIGGER, SELL_SIGNAL_TRIGGER,
        STOP_LOSS, REPEATED_BUY_MARGIN, BEAR_SELL_PERCENTAGE,
        BEAR_LOSS_START, REPEATED_SELL_MARGIN,
    } = require('./constants').investment;


// Bot Global Variables
global.wallet = INITIAL_INVESTMENT;
global.currencyWallet = {};
global.latestPrice = {};
global.tickerPrices = {};
global.storedWeightedSignalScore = {};
global.frozenTickers = {}; // these tickers are based on correlation with the currency wallet to improve diversification
global.MAX_SCORE_INTERVAL = {};

// Indicator parameters
global.RSI = RSI;
global.ADX = ADX;
global.ADX_STRONG_MULTIPLIER = ADX_STRONG_MULTIPLIER;
global.ADX_WEAK_MULTIPLIER = ADX_WEAK_MULTIPLIER;
global.SMA = SMA;
global.DEMA = DEMA;
global.PSAR_STEP = PSAR_STEP;
global.PSAR_MAX = PSAR_MAX;
global.PSAR_BASE_SCORE = PSAR_BASE_SCORE;
global.RSI_BASE_SCORE = RSI_BASE_SCORE;
global.DEMA_SMA_CROSS_SCORE = DEMA_SMA_CROSS_SCORE;
global.BB_STD_DEV = BB_STD_DEV;
global.LOWER_RSI = LOWER_RSI;
global.UPPER_RSI = UPPER_RSI;
global.CORRELATION_PERIOD = CORRELATION_PERIOD;

// Investment parameters
global.INITIAL_INVESTMENT = INITIAL_INVESTMENT;
global.INVEST_PERCENTAGE = INVEST_PERCENTAGE;
global.MIN_PROFIT_PERCENTAGE = MIN_PROFIT_PERCENTAGE;
global.TRADING_FEE = TRADING_FEE;
global.BUY_SIGNAL_TRIGGER = BUY_SIGNAL_TRIGGER;
global.SELL_SIGNAL_TRIGGER = SELL_SIGNAL_TRIGGER;
global.STOP_LOSS = STOP_LOSS;
global.REPEATED_BUY_MARGIN = REPEATED_BUY_MARGIN;
global.BEAR_SELL_PERCENTAGE = BEAR_SELL_PERCENTAGE;
global.BEAR_LOSS_START = BEAR_LOSS_START;
global.REPEATED_SELL_MARGIN = REPEATED_SELL_MARGIN;

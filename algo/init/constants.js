const investment = {
    INITIAL_INVESTMENT: 1,
    INVEST_PERCENTAGE: 0.12,
    BUY_SIGNAL_TRIGGER: 10, // if score > this, buy
    SELL_SIGNAL_TRIGGER: -10, // if score < this, sell
    SHORT_SIGNAL_TRIGGER: -11,
    TRADING_FEE: 0.0005, // trading fee fors all buys/sells (in decimals)
    MIN_PROFIT_PERCENTAGE: 0.015, // min profit to make a move (in decimals)
    IS_BUY_IMMEDIATELY: false, // if entry point is carefully selected, enable this. Else, disable.
    STOP_LOSS: 0.018, // sell if lost more than (in decimals)
    REPEATED_BUY_MARGIN: 0.03, // for the same coin, repeated buys must be X% lower than the current book price (in decimals)
    BEAR_SELL_PERCENTAGE: 0.3, // percentage of normal INVEST_PERCENTAGE (in decimals)
    BEAR_LOSS_START: 0.015, // if a given coin lost a certain percentage, we consider it a bear market (in decimals)
    UP_STOP_LIMIT: 0.005, // how much % to decrease before closing an upward trend position (in decimals)
    DOWN_STOP_LIMIT: 0.008, // how much % to increase before entering an long position (in decimals)
};

const orderBook = {
    DEMAND_SUPPLY_SPREAD_MULTIPLIER: 1.1,
    DEMAND_SUPPLY_DISTANCE: 3, // Demand is N times Supply, vice versa
    SPREAD_THRESHOLD: 0.01, // 1% of bid/ask average, volatile if pass this threshold
    AGGREGATE_SUPPLY_DEMAND_BASE: 1, // the base score for this subsignal
};

module.exports = {
    investment,
    orderBook,
};

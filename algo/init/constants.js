const investment = {
    INITIAL_INVESTMENT: 0.027,
    INVEST_PERCENTAGE: 0.1,
    BUY_SIGNAL_TRIGGER: 10, // if score > this, buy
    SELL_SIGNAL_TRIGGER: -10, // if score < this, sell
    SHORT_SIGNAL_TRIGGER: -11,
    TRADING_FEE: 0.0005, // 0.X% fors all buys/sells
    MIN_PROFIT_PERCENTAGE: 0.012, // 0.X% for min profit to make a move
    IS_BUY_IMMEDIATELY: false, // if entry point is carefully selected, enable this. Else, disable.
    STOP_LOSS: 0.024, // sell if lost more than X%
    REPEATED_BUY_MARGIN: 0.04, // for the same coin, repeated buys must be X% lower than the current book price
    BEAR_SELL_PERCENTAGE: 0.15, // percentage of normal INVEST_PERCENTAGE
    BEAR_LOSS_START: 0.01, // if a given coin lost X%, we consider it a bear market
    UP_STOP_LIMIT: 0.0035, // how much % to decrease before closing an upward trend position
    DOWN_STOP_LIMIT: 0.006, // how much % to increase before entering an long position
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

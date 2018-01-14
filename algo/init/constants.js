let investment = {
    INITIAL_INVESTMENT: 1400,
    INVEST_PERCENTAGE: 0.12,
    BUY_SIGNAL_TRIGGER: 10, // if score > this, buy
    SELL_SIGNAL_TRIGGER: -10, // if score < this, sell
    TRADING_FEE: 0.002, // 0.X% for all buys/sells
    MIN_PROFIT_PERCENTAGE: 0.012, // 0.X% for min profit to make a move
    IS_BUY_IMMEDIATELY: false, // if entry point is carefully selected, enable this. Else, disable.
    STOP_LOSS: 0.9, // sell if lost more than X%
    REPEATED_BUY_MARGIN: 0.02, // for the same coin, repeated buys must be X% lower than the current book price
    BEAR_SELL_PERCENTAGE: 0.25, // percentage of normal INVEST_PERCENTAGE
    BEAR_LOSS_START: 0.025, // if a given coin lost X%, we consider it a bear market
  };

const orderBook = {
    DEMAND_SUPPLY_SPREAD_MULTIPLIER: 1.1,
    DEMAND_SUPPLY_DISTANCE: 3, // Demand is N times Supply, vice versa
    SPREAD_THRESHOLD: 0.01, // 1% of bid/ask average, volatile if pass this threshold
    AGGREGATE_SUPPLY_DEMAND_BASE: 1 // the base score for this subsignal
}

module.exports = {
    investment: investment,
    orderBook: orderBook
};
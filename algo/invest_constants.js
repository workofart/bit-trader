const invest = {
    INITIAL_INVESTMENT: 1000,
    INVEST_PERCENTAGE: 0.1,
    BUY_SIGNAL_TRIGGER: 10, // if score > this, buy
    SELL_SIGNAL_TRIGGER: -10, // if score < this, sell
    TRADING_FEE: 0.002, // 0.X% for all buys/sells
    MIN_PROFIT_PERCENTAGE: 0.01, // 0.X% for min profit to make a move
    MAX_SCORE_INTERVAL: {}, // The maximum number of data points before making a decision then resetting all signal
    IS_BUY_IMMEDIATELY: false, // if entry point is carefully selected, enable this. Else, disable.
    STOP_LOSS: 0.9, // sell if lost more than X%
    REPEATED_BUY_MARGIN: 0.02, // for the same coin, repeated buys must be X% lower than the current book price
  };

module.exports = invest;
const
    _ = require('underscore');

/************** OrderBook Parameters **************/
const { DEMAND_SUPPLY_SPREAD_MULTIPLIER,
    DEMAND_SUPPLY_DISTANCE,
    SPREAD_THRESHOLD,
    AGGREGATE_SUPPLY_DEMAND_BASE } = require('../constants').orderBook;

let orderBook_Bid = [],
    orderBook_Ask = [];

// util.log('--------------- OrderBook Parameters --------------')


/***************************************************/
/*           Order Book Functions                  */
/***************************************************/

let processOrderBook = (ticker, data) => {
    let processScore = 0;
    let price, amount, count = 0;

    price = data[0];
    count = data[1];
    amount = data[2];

    syncOrderBook(ticker, price, count, amount);
    // processScore[ticker] += analyzeDemandSupply(ticker, DEMAND_SUPPLY_DISTANCE);
    // console.log('\n\nDemand: ' + demand)
    // console.log('Supply: ' + supply)
    // console.log('Price: {}', price)
    // console.log('Count: {}', count)
    // console.log('Amount: {}', amount)
    // if (processScore[ticker] != 0) {
    //     util.log(`[${ticker}] Demand/Supply score: ${processScore[ticker]}`)
    // }
    // return processScore[ticker];
}

// Analyzes aggregate demand/supply as well as the spread
function analyzeDemandSupply(ticker, threshold) {
    let subscore = 0;
    let { supply, demand } = calculateDemandSupply(ticker);
    // console.log('[' + ticker + '] demand = ' + (demand / supply).toFixed(2) + ' * supply');

    if (demand > 0 && supply > 0) {
        // Aggregate Demand/Supply
        if (demand > supply * (1 + threshold)) {
            subscore += AGGREGATE_SUPPLY_DEMAND_BASE * (demand / supply)
            // console.log('Price will rise for [' + ticker + ']')
        }
        else if (supply > demand * (1 + threshold)) {
            subscore -= AGGREGATE_SUPPLY_DEMAND_BASE * (supply / demand)
            // console.log('Price will fall for [' + ticker + ']')
        }

        // Demand/Supply spread (only act as the multiplier)
        let spreadPercentage = getDemandSupplySpread(ticker)

        if (spreadPercentage > SPREAD_THRESHOLD) {
            subscore *= DEMAND_SUPPLY_SPREAD_MULTIPLIER
        }
        // console.log(ticker + ' | Ask Book: ' + Object.keys(orderBook_Ask[ticker]).length)
        // console.log(ticker + ' | Bid Book: ' + Object.keys(orderBook_Bid[ticker]).length)

    }
    return subscore;
}

function getDemandSupplySpread(ticker) {
    let bidPrices = _.sortBy(Object.keys(orderBook_Bid[ticker]), (num) => {
        return -num;
    });
    let askPrices = _.sortBy(Object.keys(orderBook_Ask[ticker]));

    if (bidPrices.length > 0 && askPrices.length > 0) {
        // let spreadDollars = orderBook_Ask[ticker][askPrices[0]] * -askPrices[0] - orderBook_Bid[ticker][bidPrices[0]] * bidPrices[0];
        // util.log(`Spread Dollars: ${spreadDollars}\n`)

        let spreadPrice = askPrices[0] - bidPrices[0];
        let spreadPercentage = spreadPrice / ((parseFloat(askPrices[0]) + parseFloat(bidPrices[0])) / 2);
        // util.log(`BidPrices: ${bidPrices}`)
        // util.log(`AskPrices: ${askPrices}`)
        // util.log(`Spread Price: ${spreadPrice}`)
        // util.log(`Spread Percentage: ${spreadPercentage}\n`)
        return spreadPercentage;
    }

}

// Calculates the aggregate demand/supply of all price points
function calculateDemandSupply(ticker) {
    // Ask
    let askSum = 0, bidSum = 0;
    for (i in orderBook_Ask[ticker]) {
        askSum += orderBook_Ask[ticker][i] * i;
    }

    for (i in orderBook_Bid[ticker]) {
        bidSum += orderBook_Bid[ticker][i] * i;
    }
    return { demand: bidSum, supply: askSum }

}

function syncOrderBook(ticker, price, count, amount) {
    orderBook_Ask[ticker] = orderBook_Ask[ticker] === undefined ? {} : orderBook_Ask[ticker];
    orderBook_Bid[ticker] = orderBook_Bid[ticker] === undefined ? {} : orderBook_Bid[ticker];
    // Add or update to book
    if (count > 0) {
        // Bid
        if (amount > 0) {
            orderBook_Bid[ticker][price] = amount * count;
        }
        // Ask
        else {
            amount = -amount;
            orderBook_Ask[ticker][price] = amount * count;
        }
    }
    // Delete from book
    else {
        // Bid
        if (amount > 0) {
            delete orderBook_Bid[ticker][price];
            // console.log('removing order from bid book')
        }
        // Ask
        else {
            delete orderBook_Ask[ticker][price];
            // console.log('removing order from ask book')
        }
    }
}

/**
 * This is used when the bitfinex connection resets and need to clear the order books
 * to prevent stale prices
 */
function clearOrderBook() {
    orderBook_Bid = [];
    orderBook_Ask = [];
}

module.exports = {
    syncOrderBook : syncOrderBook,
    clearOrderBook: clearOrderBook,
    calculateDemandSupply: calculateDemandSupply,
    getDemandSupplySpread: getDemandSupplySpread,
    analyzeDemandSupply: analyzeDemandSupply,
    processOrderBook : processOrderBook
};

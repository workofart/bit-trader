const MIN_AMOUNT = require('./minOrder');
const {
        INITIAL_INVESTMENT, INVEST_PERCENTAGE,
        MIN_PROFIT_PERCENTAGE, TRADING_FEE,
        BUY_SIGNAL_TRIGGER, SELL_SIGNAL_TRIGGER
    }  = require('./invest_constants');

/***************************************************/
/*              Investment Functions               */
/***************************************************/
function invest(score, ticker) {
    if ( global.latestPrice[ticker] != undefined) {
        var price =  global.latestPrice[ticker];
        var qty = INVEST_PERCENTAGE * INITIAL_INVESTMENT / price;

         global.currencyWallet[ticker] =  global.currencyWallet[ticker] != undefined ?  global.currencyWallet[ticker] : {}
         global.currencyWallet[ticker].qty =  global.currencyWallet[ticker].qty != undefined ?  global.currencyWallet[ticker].qty : 0
         global.currencyWallet[ticker].price =  global.currencyWallet[ticker].price != undefined ?  global.currencyWallet[ticker].price : 0

        // BUY
        if (buyPositionCheck(ticker, qty, price, score)) {
            var minAmount = _.find(MIN_AMOUNT, (item) => { return item.pair === ticker.toLowerCase()}).minimum_order_size;
            var times = (qty / minAmount).toFixed(0);
            qty = minAmount * times;
            submitMarketOrder(ticker, side);
            
        }

        // SELL
        else if (sellPositionCheck(ticker, price, score)) {
            submitMarketOrder(ticker, side)
        }
    }

}

// Checks the long position on hand and evaluate whether
// it's logical to exit the position
function sellPositionCheck(ticker, price, score) {
    var lastPrice =  global.currencyWallet[ticker].price;

    // util.log(`Checking sell position ${lastPrice}`)
    // Can it maintain the min profit requirement and trading fee
    if ((sellSignalReq(score) || minProfitReq(price) || stopLossReq(ticker, price))
        && currencyBalanceReq(ticker))
    {
        return true
    }
    else {
        return false
    }
}


// Checks the long position on hand and evaluate whether
// it's logical to enter the position
function buyPositionCheck(ticker, qty, price, score) {
    var lastPrice =  global.currencyWallet[ticker].price;

    // util.log(`Checking buy [${ticker}] position ${lastPrice}`)
    // Can it maintain the min profit requirement and trading fee
    if (buySignalReq(score) && fiatBalanceReq(qty, price) && repeatedBuyReq(ticker, price)) {
        return true
    }
    else {
        return false
    }
}

const repeatedBuyReq = (ticker, price) => {
    var lastPrice =  global.currencyWallet[ticker].price;
    return lastPrice == 0 || price.toFixed(4) < lastPrice.toFixed(4) * 0.99
}

const stopLossReq = (ticker, price) => {
    var lastPrice =  global.currencyWallet[ticker].price;
    return price < lastPrice * (1 - STOP_LOSS)
}

const sellSignalReq = (score) => {
    return score <= SELL_SIGNAL_TRIGGER;
}

const buySignalReq = (score) => {
    return score >= BUY_SIGNAL_TRIGGER;
}

const fiatBalanceReq = (qty, price) => {
    return  global.wallet >= qty * price;
}

const currencyBalanceReq = (ticker) => {
    return  global.currencyWallet[ticker].qty > 0
}
const minProfitReq = (ticker, price) => {
    var lastPrice =  global.currencyWallet[ticker].price;
    return (price > lastPrice * (1 + MIN_PROFIT_PERCENTAGE + TRADING_FEE))
}

const submitMarketOrder = (ticker, side) => {
    if (side === 'sell') {
        executor.submitMarket(ticker,  global.currencyWallet[ticker].qty, side).then((res) => {
            res = JSON.parse(res);
            var executedPrice = parseFloat(res.price);
            var avgExecutedPrice = res.avg_execution_price;
            delete res.is_cancelled;
            delete res.exchange;
            delete res.was_forced;
            delete res.is_live;
            delete res.is_hidden;
    
             global.wallet +=  global.currencyWallet[ticker].qty * executedPrice * (1 - TRADING_FEE);
            // util.log(`************ Sell | ${ global.currencyWallet[ticker].qty
            util.log(`\n****************************************************`)
            util.log(res)
            util.log(`****************************************************\n`)
            db.storeTransactionToDB(ticker, executedPrice,  global.currencyWallet[ticker].qty, 0);
             global.currencyWallet[ticker].qty = 0; // clear qty after sold, assuming always sell the same qty
             global.currencyWallet[ticker].price = 0; // clear the price after sold
            storedWeightedSignalScore[ticker] = 0; // clear score
            utilities.printWalletStatus(INITIAL_INVESTMENT,  global.wallet,  global.currencyWallet,  global.latestPrice);
        }).catch((reason) => {
            util.error('!!!!!!!!!!!!!!!! Market Order Error !!!!!!!!!!!!!!!!')
            util.error(reason)
            util.error('!!!!!!!!!!!!!!!! Market Order Error !!!!!!!!!!!!!!!!')
        })
    }
    else if (side === 'buy') {
        executor.submitMarket(ticker, qty, side).then((res) => {
            res = JSON.parse(res);
            var executedPrice = parseFloat(res.price);
            var avgExecutedPrice = res.avg_execution_price;
            delete res.is_cancelled;
            delete res.exchange;
            delete res.was_forced;
            delete res.is_live;
            delete res.is_hidden;
            util.log('executedPrice: ' + executedPrice)

             global.wallet -= qty * executedPrice * (1 + TRADING_FEE);
             global.currencyWallet[ticker].price = (executedPrice * qty +  global.currencyWallet[ticker].qty *  global.currencyWallet[ticker].price) / (qty +  global.currencyWallet[ticker].qty); // calculate the weighted average price of all positions
             global.currencyWallet[ticker].qty += qty;

            // util.log(`************* Buy | ${qty} ${ticker} @ ${price} *************`)
            util.log(`\n****************************************************`)
            util.log(res)
            util.log(`****************************************************\n`)
            utilities.printWalletStatus(INITIAL_INVESTMENT,  global.wallet,  global.currencyWallet,  global.latestPrice);
            db.storeTransactionToDB(ticker, executedPrice, qty, 1);
            storedWeightedSignalScore[ticker] = 0; // clear score
        }).catch((reason) => {
            util.error('!!!!!!!!!!!!!!!! Market Order Error !!!!!!!!!!!!!!!!')
            util.error(reason)
            util.error('!!!!!!!!!!!!!!!! Market Order Error !!!!!!!!!!!!!!!!')
        })
    }
}

module.exports = {
    buyPositionCheck : buyPositionCheck,
    sellPositionCheck: sellPositionCheck,
    invest: invest
}
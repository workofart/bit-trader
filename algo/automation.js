/**
 * This file contains functions that will help perform tedious tasks in a split second
 */
const executor = require('./executorBinance'),
      _ = require('underscore'),
      MIN_AMOUNT = require('./minOrder');


let latestActiveBuyOrders = {},
    latestActiveSellOrders = {};


module.exports.raceTheBook = (ticker, side, orderBook_Ask, orderBook_Bid, qty) => {
    if (latestActiveBuyOrders[ticker] === undefined) {
        latestActiveBuyOrders[ticker] = 0;
    }
    if (latestActiveSellOrders[ticker] === undefined) {
        latestActiveSellOrders[ticker] = 999999;
    }
    let precision = _.find(MIN_AMOUNT, (item) => { return item.pair === ticker.toLowerCase()});
    let pricePrecision = precision.price_precision;
    // console.log(`Min Amount [${ticker}]: ${precision.minimum_order_size}`)
    if (orderBook_Ask[ticker] != undefined && orderBook_Bid[ticker] != undefined) 
    {
        let buyTOB = parseFloat(_.max(Object.keys(orderBook_Bid[ticker])))
        let sellTOB = parseFloat(_.min(Object.keys(orderBook_Ask[ticker])))
        
        // console.log(`BuyTOB: ${buyTOB}\nSellTOB: ${sellTOB}\nSpread: ${_spread(buyTOB, sellTOB)}`)
        if (side === 'buy') {
            let targetPrice = _babyStep(buyTOB, side);
            if (targetPrice < sellTOB && targetPrice > latestActiveBuyOrders[ticker]) {
                latestActiveBuyOrders[ticker] = targetPrice;
                console.log(`Buy @ [${targetPrice}] | buyTOB=${buyTOB} | sellTOB=${sellTOB}`);
                executor.cancelPreviousSubmitNew(ticker.toLowerCase(), targetPrice.toString(), qty, side).then((data) => {console.log(data.price)});
            }
            // console.log(JSON.stringify(_.sortBy(Object.keys(orderBook_Bid[ticker]))))
        }
        else {
            let targetPrice = _babyStep(sellTOB, side);
            if (targetPrice > buyTOB && targetPrice < latestActiveBuyOrders[ticker]) {
                latestActiveSellOrders[ticker] = targetPrice;
                console.log(`Sell @ [${targetPrice}] | sellTOB=${sellTOB} | buyTOB=${buyTOB}`);
                executor.cancelPreviousSubmitNew(ticker.toLowerCase(), targetPrice.toString(), qty, side).then((data) => {console.log(data.price)});
            }
        }
    }
}

_spread = (topBid, topAsk) => {
    return `${(((topAsk - topBid) / topBid) * 100).toFixed(2)}%`
}

/**
 * This function increments or decrements the given number to the next smallest precision unit
 */
_babyStep = (number, side) => {
    let numbers = number.toString().split('');
    if (numbers.length < 5) {
        // console.log('Converting ' + number + ' to fixed')
        number = parseFloat(number).toFixed(5 - numbers.length);
    }
    numbers = number.toString().split('');
    // console.log('Parsing | ' + numbers)
    let foundNonNine = false;
    for (let i = numbers.length - 1; i >= 0; i--)
    {
        // console.log('Checking -> ' + numbers[i])
        if (numbers[i] == '9' && !foundNonNine) {
            numbers[i] = 0;
        }
        else if (!foundNonNine && numbers[i] != '9' && numbers[i] != '.') {
            if (side === 'buy') {
                numbers[i] = parseInt(numbers[i]) + 1;
            }
            else if (side === 'sell') {
                numbers[i] = parseInt(numbers[i]) - 1;
            }
            foundNonNine = true;
            // console.log('incremented ' + numbers[i])
        }
        else if (numbers[i] === '.') {
            numbers[i] = '.';
        }
        else {
            numbers[i] = parseInt(numbers[i]);
        }
    }
    return parseFloat(numbers.join(''));
}
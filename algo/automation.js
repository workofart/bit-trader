/**
 * This file contains functions that will help perform tedious tasks in a split second
 */
const userAPI = require('../api/user_functions');
const executor = require('./executor');
const _ = require('underscore');
const MIN_AMOUNT = require('./minOrder');

module.exports.raceTheBook = (ticker, side, orderBook_Ask, orderBook_Bid) => {
    var precision = _.find(MIN_AMOUNT, (item) => { return item.pair === ticker.toLowerCase()});
    var pricePrecision = precision.price_precision;
    // console.log(`Min Amount [${ticker}]: ${precision.minimum_order_size}`)
    if (orderBook_Ask[ticker] != undefined && orderBook_Bid[ticker] != undefined) 
    {
        var buyTOB = parseFloat(_.max(Object.keys(orderBook_Bid[ticker])))
        var sellTOB = parseFloat(_.min(Object.keys(orderBook_Ask[ticker])))
        
        // console.log(`BuyTOB: ${buyTOB}\nSellTOB: ${sellTOB}\nSpread: ${_spread(buyTOB, sellTOB)}`)
        if (side === 'buy') {
            var targetPrice = _babyStep(buyTOB, side);
            if (targetPrice < sellTOB) {
                // console.log(`Buy @ [${targetPrice}] | sellTOB=${sellTOB}`);
            }
            // console.log(JSON.stringify(_.sortBy(Object.keys(orderBook_Bid[ticker]))))
        }
        else {
            var targetPrice = _babyStep(sellTOB, side);
            if (targetPrice > buyTOB) {
                // console.log(`Sell @ [${targetPrice}] | buyTOB=${buyTOB}`);
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
    var numbers = number.toString().split('');
    if (numbers.length < 5) {
        // console.log('Converting ' + number + ' to fixed')
        number = parseFloat(number).toFixed(5 - numbers.length);
    }
    numbers = number.toString().split('');
    // console.log('Parsing | ' + numbers)
    var foundNonNine = false;
    for (var i = numbers.length - 1; i >= 0; i--)
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
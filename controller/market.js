const _ = require('underscore');
const request = require('request');
const util = require('util')
const moment = require('moment')

const URL = 'http://127.0.0.1:3001/api/'


const selectedPairs = [
    'btcusd',
    'ltcusd',
    'ethusd',
    'etcusd',
    'rrtusd',
    'zecusd',
    'xmrusd',
    'dshusd',
    'xrpusd',
    'iotusd',
    'eosusd',
    'sanusd',
    'omgusd',
    'bchusd'
]

const getDemandSupply = (data, type) => {
    if (type === 'trade') {
        var time0 = moment.unix(data[0].timestamp);
        var timeN = moment.unix(data[data.length - 1].timestamp);
        util.log(`# of Trades: ${data.length}`)
    }
    else {
        var time0 = moment.unix(data.bids[0].timestamp);
        var timeN = moment.unix(data.bids[data.bids.length - 1].timestamp);
        util.log(`# of Bids: ${data.bids.length}`)
        util.log(`# of Asks: ${data.asks.length}`)
    }
    util.log(`time0: ${time0}`)
    util.log(`timeN: ${timeN}`)
    util.log(`Duration: ${time0.diff(timeN, 'days')} days`)
}

const analyzeOrderBook = (ticker) => {
    const url = URL + 'getOrdersByTicker/' + ticker

    request.get(
        url,
        function(err, response, body) {
            if (err) {
                util.error(err)
            }
            else {
                getDemandSupply(JSON.parse(body), 'order')
            }
        }
    )

}

const analyzeTradeBook = (ticker) => {
    const url = URL + 'getTradesByTicker/' + ticker

    request.get(
        url,
        function(err, response, body) {
            if (err) {
                util.error(err)
            }
            else {
                getDemandSupply(JSON.parse(body), 'trade')
            }
        }
    )

}

const insertPrice = (ticker) => {
    var url = URL + 'getPriceByTicker/' + ticker
    request.get(
        url,
        function(err, response, body) {
            if (err) {
                util.error(err)
            }
            else {
                // util.debug('Insert price body:')
                // util.debug(body);
                var data = JSON.parse(body)
                var json_body = {
                            pair: ticker,
                            mid: data.mid,
                            bid: data.bid,
                            ask: data.ask,
                            last_price: data.last_price,
                            low: data.low,
                            high: data.high,
                            volume: data.volume,
                            timestamp: moment.unix(data.timestamp).local().format('YYYY-MM-DD HH:mm:ss')
                        }
                // util.debug(json_body)
                util.debug('Processing ' + ticker)
                url = URL + 'insertPrice'
                request.post(url,
                    {
                        json: json_body
                    },
                    function(err, response, body) {
                        if (err) {
                            util.error(err)
                        }
                        else {
                            util.log(body)
                            // pause(1000)
                        }
                    })
            }
        })

    
}

// analyzeOrderBook('ethusd')
// analyzeTradeBook('ethusd')


const pause = (ms) => {
    var dt = new Date();
	while ((new Date()) - dt <= ms) { /* Do nothing */ }
}

// const getPriceRetryWrapper = (fn, ticker) => {
//     return fn(ticker).catch(function(err) {
//         if (err.error == 'ERR_RATE_LIMIT') {
//             util.debug('API rate limit exceeded...retrying again in 3 seconds...')
//             pause(3000)
//         }
//         return getPriceRetryWrapper(fn, ticker);
//     })
// }

const getPairPriceHandler = () => {
    while(true) {
        selectedPairs.forEach(function(ticker) {
            insertPrice(ticker)
            pause(3000)
        })
        util.log('Finished 1 iteration')
    }    
}

// insertPrice('ethusd');
getPairPriceHandler();

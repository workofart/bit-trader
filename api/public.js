const _ = require('underscore');
const request = require('request')
const util = require('util')

const URL = 'https://api.bitfinex.com/v1/'

var sendJsonResponse = function (res, status, content){
    res.status(status);
    res.json(content);
}

const _getAllTradingPairs = (res) => {
    var url = URL + 'symbols'
    request.get(
        url,
        function(err, response, body) {
            if (err) {
                util.error(err)
            }
            else {
                sendJsonResponse(res, 200, JSON.parse(body))
            }
        }
    )
}

const _getPriceByTicker = (ticker, res) => {
    var url = URL + 'pubticker/' + ticker;
    util.debug(url)
    // Raw Javascript - replace symbol for other tickers
    request.get(url,
        function(err, response, body) {
            if (err) {
                util.error(err)
            }
            else {
                // util.debug(JSON.stringify(res));
                sendJsonResponse(res, 200, JSON.parse(body))
                // sendJsonResponse(res, 200, body)
            }
        })
}

const _getVolumeByTicker = (ticker, res) => {
    var url = URL + 'stats/' + ticker;
    util.debug(url)

    request.get(url,
        function(err, response, body) {
            if (err) {
                util.error(err)
            }
            else {
                sendJsonResponse(res, 200, JSON.parse(body))
            }
        })
}


const _getOrdersByTicker = (ticker, res) => {
    var url = URL + 'book/' + ticker;
    util.debug(url)

    request.get(
        {
            url: url,
            body: JSON.stringify({
                limit_bids: 10000,
                limit_asks: 10000
            })
        },  
        function(err, response, body) {
            if (err) {
                util.error(err)
            }
            else {
                sendJsonResponse(res, 200, JSON.parse(body))
            }
        })
}

const _getTradesByTicker = (ticker, res) => {
    var url = URL + 'trades/' + ticker;
    util.debug(url)

    request.get(
        {   
            url: url,
            body: JSON.stringify({limit_trades: 10000})
        },
        function(err, response, body) {
            if (err) {
                util.error(err)
            }
            else {
                sendJsonResponse(res, 200, JSON.parse(body))
            }
        })
}


const _getPairStats = (ticker, res) => {
    var url = URL + 'symbols_details';
    util.debug(url)

    request.get(url,
        function(err, response, body) {
            if (err) {
                util.error(err)
            }
            else {
                sendJsonResponse(res, 200, JSON.parse(body))
            }
        })
}






/*********************************************************
 *                  Exported API end points
 *********************************************************/

module.exports.getPriceByTicker = (req, res) => {
    const ticker = req.params.ticker;
    _getPriceByTicker(ticker, res)
}

module.exports.getVolumeByTicker = (req, res) => {
    const ticker = req.params.ticker;
    _getVolumeByTicker(ticker, res)
}


module.exports.getOrdersByTicker = (req, res) => {
    const ticker = req.params.ticker;
    _getOrdersByTicker(ticker, res)
}


module.exports.getTradesByTicker = (req, res) => {
    const ticker = req.params.ticker;
    _getTradesByTicker(ticker, res)
}

/******************************************************
 *                    All  Pairs
 ******************************************************/

module.exports.getAllTradingPairs = (req, res) => {
    _getAllTradingPairs(res)
}

module.exports.getPairStats = (req, res) => {
    _getPairStats(res)
}
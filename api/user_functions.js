const _ = require('underscore');
const request = require('request')
const util = require('util')
const $ = require('jquery')
const moment = require('moment')

/*
    Authentication Tools
*/

const crypto = require('crypto')
const creds = require('../config/creds')

const apiKey = creds.key;
const apiSecret = creds.secret;


const URL = 'https://api.bitfinex.com/v1/'

var sendJsonResponse = function (res, status, content) {
    res.status(status);
    res.json(content);
}

const getPayload = (body) => {
    return new Buffer(JSON.stringify(body)).toString('base64')
}

const getSignature = (payload) => {
    return crypto
        .createHmac('sha384', apiSecret)
        .update(payload)
        .digest('hex')
}

const getOptions = (url, body, queryParams = {}) => {
    const payload = getPayload(body);
    return {
        url: url,
        headers: {
            'X-BFX-APIKEY': apiKey,
            'X-BFX-PAYLOAD': payload,
            'X-BFX-SIGNATURE': getSignature(payload)
        },
        body: JSON.stringify(body)
    }
}

_getAccountInfo = (callback) => {
    const nonce = (Date.now() * 10000).toString()
    const completeURL = URL + 'account_infos'
    const body = {
        request: '/v1/account_infos',
        nonce
    }
    return request.post(
        getOptions(completeURL, body),
        function (error, response, body) {
            callback(JSON.parse(body))
        }
    );

}


_getTradingSummary = (callback) => {
    const nonce = (Date.now() * 10000).toString()
    const completeURL = URL + 'summary'
    const body = {
        request: '/v1/summary',
        nonce
    }

    return request.post(
        getOptions(completeURL, body),
        function (error, response, body) {
            callback(JSON.parse(body))
        }
    )
}


_getMarginSummary = (callback) => {
    const nonce = (Date.now() * 10000).toString()
    const completeURL = URL + 'margin_infos'
    const body = {
        request: '/v1/margin_infos',
        nonce
    }

    return request.post(
        getOptions(completeURL, body),
        function (error, response, body) {
            callback(JSON.parse(body))
        }
    )
}

_getWalletBalance = (callback) => {
    const nonce = (Date.now() * 10000).toString()
    const completeURL = URL + 'balances'
    const body = {
        request: '/v1/balances',
        nonce
    }

    return request.post(
        getOptions(completeURL, body),
        function (error, response, body) {
            callback(JSON.parse(body))
        }
    )
}

_getActivePositions = (callback) => {
    const nonce = (Date.now() * 10000).toString()
    const completeURL = URL + 'positions'
    const body = {
        request: '/v1/positions',
        nonce
    }

    return request.post(
        getOptions(completeURL, body),
        function (error, response, body) {
            callback(JSON.parse(body))
        }
    )
}

_getActiveOrders = (callback) => {
    const nonce = (Date.now() * 10000).toString()
    const completeURL = URL + 'orders'
    const body = {
        request: '/v1/orders',
        nonce
    }

    return request.post(
        getOptions(completeURL, body),
        function (error, response, body) {
            callback(JSON.parse(body))
        }
    )
}


_getLedgerEntries = (callback) => {
    const nonce = (Date.now() * 10000).toString()
    const completeURL = URL + 'history'
    const body = {
        request: '/v1/history',
        currency: 'usd',
        nonce
    }

    return request.post(
        getOptions(completeURL, body),
        function (error, response, body) {
            callback(JSON.parse(body))
        }
    )
}

_getPastTrades = (callback) => {
    const nonce = (Date.now() * 10000).toString()
    const completeURL = URL + 'mytrades'
    const body = {
        request: '/v1/mytrades',
        nonce,
        symbol: 'btcusd',
        timestamp: moment().subtract(7, 'days').unix()
    }

    util.debug(moment().subtract(7, 'days').unix())

    return request.post(
        getOptions(completeURL, body),
        function (error, response, body) {
            callback(JSON.parse(body))
        }
    )
}

_postNewOrder = (params, callback) => {
    const nonce = (Date.now() * 10000).toString()
    const completeURL = URL + 'order/new'
    const { ticker, amount, price, side, type } = params;
    const body = {
        request: '/v1/order/new',
        nonce,
        symbol: ticker,
        type: type,
        amount: amount,
        price: price,
        side: side,
        exchange: 'bitfinex',
        is_hidden: false,
        is_postonly: true,
        use_all_available: 0,
        ocoorder: false,
        buy_price_oco: 0,
        sell_price_oco: 0
    }

    // util.log(body);

    return request.post(
        getOptions(completeURL, body),
        function (error, response, body) {
            callback(JSON.parse(body))
        }
    )
}

_getOrderStatus = (id, callback) => {
    const nonce = (Date.now() * 10000).toString()
    const completeURL = URL + 'order/status'

    const body = {
        request: '/v1/order/status',
        nonce,
        order_id: id,
    }

    return request.post(
        getOptions(completeURL, body),
        function (error, response, body) {
            callback(JSON.parse(body))
        }
    )
}

_cancelOrder = (id, callback) => {
    const nonce = (Date.now() * 10000).toString()
    const completeURL = URL + 'order/cancel'

    const body = {
        request: '/v1/order/cancel',
        nonce,
        order_id: id,
    }

    return request.post(
        getOptions(completeURL, body),
        function (error, response, body) {
            callback(JSON.parse(body))
        }
    )
}

/*********************************************************
 *                  Exported API end points
 *********************************************************/


module.exports.getAccountInfo = (callback) => {
    _getAccountInfo(callback);
}


module.exports.getTradingSummary = (callback) => {
    _getTradingSummary(callback)
}

module.exports.getMarginSummary = (callback) => {
    _getMarginSummary(callback)
}

module.exports.getWalletBalance = (callback) => {
    _getWalletBalance(callback)
}

module.exports.getActivePositions = (callback) => {
    _getActivePositions(callback)
}

module.exports.getActiveOrders = (callback) => {
    _getActiveOrders(callback)
}

module.exports.getLedgerEntries = (callback) => {
    _getLedgerEntries(callback)
}

module.exports.getPastTrades = (callback) => {
    _getPastTrades(callback)
}

module.exports.postNewOrder = (params, callback) => {
    _postNewOrder(params, callback)
}

module.exports.getOrderStatus = (id, callback) => {
    _getOrderStatus(id, callback)
}

module.exports.cancelOrder = (id, callback) => {
    _cancelOrder(id, callback)
}
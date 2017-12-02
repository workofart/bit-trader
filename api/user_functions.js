const _ = require('underscore');
const request = require('request-promise')
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

const _getAccountInfo = async () => {
    const nonce = (Date.now() * 10000).toString()
    const completeURL = URL + 'account_infos'
    const body = {
        request: '/v1/account_infos',
        nonce
    }
    let res = await request.post(getOptions(completeURL, body))
    return res;

}


const _getTradingSummary = async () => {
    const nonce = (Date.now() * 10000).toString()
    const completeURL = URL + 'summary'
    const body = {
        request: '/v1/summary',
        nonce
    }

    let res = await request.post(getOptions(completeURL, body))
    return res;
}


const _getMarginSummary = async () => {
    const nonce = (Date.now() * 10000).toString()
    const completeURL = URL + 'margin_infos'
    const body = {
        request: '/v1/margin_infos',
        nonce
    }

    let res = await request.post(getOptions(completeURL, body))
    return res;
}

const _getWalletBalance = async () => {
    const nonce = (Date.now() * 10000).toString()
    const completeURL = URL + 'balances'
    const body = {
        request: '/v1/balances',
        nonce
    }

    let res = await request.post(getOptions(completeURL, body))
    return res;
}

const _getActivePositions = async () => {
    const nonce = (Date.now() * 10000).toString()
    const completeURL = URL + 'positions'
    const body = {
        request: '/v1/positions',
        nonce
    }

    let res = await request.post(getOptions(completeURL, body))
    return res;
}

const _getActiveOrders = async () => {
    const nonce = (Date.now() * 10000).toString()
    const completeURL = URL + 'orders'
    const body = {
        request: '/v1/orders',
        nonce
    }

    let res = await request.post(getOptions(completeURL, body))
    return res;
}


const _getLedgerEntries = async () => {
    const nonce = (Date.now() * 10000).toString()
    const completeURL = URL + 'history'
    const body = {
        request: '/v1/history',
        currency: 'usd',
        nonce
    }

    let res = await request.post(getOptions(completeURL, body))
    return res;
}

const _getPastTrades = async () => {
    const nonce = (Date.now() * 10000).toString()
    const completeURL = URL + 'mytrades'
    const body = {
        request: '/v1/mytrades',
        nonce,
        symbol: 'btcusd',
        timestamp: moment().subtract(7, 'days').unix()
    }

    util.debug(moment().subtract(7, 'days').unix())

    let res = await request.post(getOptions(completeURL, body))
    return res;
}

const _postNewOrder = async (params) => {
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
    let res = await request.post(getOptions(completeURL, body));
    return res;
}

const _getOrderStatus = async (id) => {
    const nonce = (Date.now() * 10000).toString()
    const completeURL = URL + 'order/status'

    const body = {
        request: '/v1/order/status',
        nonce,
        order_id: id,
    }

    let res = await request.post(getOptions(completeURL, body));
    return res
}

const _cancelOrder = async (id) => {
    const nonce = (Date.now() * 10000).toString()
    const completeURL = URL + 'order/cancel'

    const body = {
        request: '/v1/order/cancel',
        nonce,
        order_id: id,
    }

    let res = await request.post(getOptions(completeURL, body));
    return res
}

/*********************************************************
 *                  Exported API end points
 *********************************************************/
module.exports = {
    getAccountInfo : _getAccountInfo,
    getTradingSummary : _getTradingSummary,
    getMarginSummary : _getMarginSummary,
    getWalletBalance : _getWalletBalance,
    getActivePositions : _getActivePositions,
    getActiveOrders : _getActiveOrders,
    getLedgerEntries : _getLedgerEntries,
    getPastTrades : _getPastTrades,
    postNewOrder : _postNewOrder,
    getOrderStatus : _getOrderStatus,
    cancelOrder : _cancelOrder
}
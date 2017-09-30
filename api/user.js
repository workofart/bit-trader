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

var sendJsonResponse = function (res, status, content){
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

const getOptions = (url, body, queryParams={}) => {
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

_getAccountInfo = (res) => {
    const nonce = Date.now().toString()
    const completeURL = URL + 'account_infos'
    const body = {
      request: '/v1/account_infos',
      nonce
    }
    
    return request.post(
        getOptions(completeURL, body),
        function(error, response, body) {
            sendJsonResponse(res, 200, JSON.parse(body));
        }
    )
}


_getTradingSummary = (res) => {
    const nonce = Date.now().toString()
    const completeURL = URL + 'summary'
    const body = {
      request: '/v1/summary',
      nonce
    }
    
    return request.post(
        getOptions(completeURL, body),
        function(error, response, body) {
            sendJsonResponse(res, 200, JSON.parse(body));
        }
    )
}


_getMarginSummary = (res) => {
    const nonce = Date.now().toString()
    const completeURL = URL + 'margin_infos'
    const body = {
      request: '/v1/margin_infos',
      nonce
    }
    
    return request.post(
        getOptions(completeURL, body),
        function(error, response, body) {
            sendJsonResponse(res, 200, JSON.parse(body));
        }
    )
}

_getWalletBalance = (res) => {
    const nonce = Date.now().toString()
    const completeURL = URL + 'balances'
    const body = {
      request: '/v1/balances',
      nonce
    }
    
    return request.post(
        getOptions(completeURL, body),
        function(error, response, body) {
            sendJsonResponse(res, 200, JSON.parse(body));
        }
    )
}

_getActivePositions = (res) => {
    const nonce = Date.now().toString()
    const completeURL = URL + 'positions'
    const body = {
      request: '/v1/positions',
      nonce
    }
    
    return request.post(
        getOptions(completeURL, body),
        function(error, response, body) {
            sendJsonResponse(res, 200, JSON.parse(body));
        }
    )
}


_getLedgerEntries = (res) => {
    const nonce = Date.now().toString()
    const completeURL = URL + 'history'
    const body = {
      request: '/v1/history',
      currency: 'usd',
      nonce
    }
    
    return request.post(
        getOptions(completeURL, body),
        function(error, response, body) {
            sendJsonResponse(res, 200, JSON.parse(body));
        }
    )
}

_getPastTrades =  (res) => {
    const nonce = Date.now().toString()
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
        function(error, response, body) {
            sendJsonResponse(res, 200, JSON.parse(body));
        }
    )
}


/*********************************************************
 *                  Exported API end points
 *********************************************************/


module.exports.getAccountInfo = (req, res) => {
    _getAccountInfo(res)
}


module.exports.getTradingSummary = (req, res) => {
    _getTradingSummary(res)
}

module.exports.getMarginSummary = (req, res) => {
    _getMarginSummary(res)
}

module.exports.getWalletBalance = (req, res) => {
    _getWalletBalance(res)
}

module.exports.getActivePositions = (req, res) => {
    _getActivePositions(res)
}

module.exports.getLedgerEntries = (req, res) => {
    _getLedgerEntries(res)
}

module.exports.getPastTrades = (req, res) => {
    _getPastTrades(res)
}


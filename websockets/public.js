/**
 * This file contains the websocket connections to Bitfinex APIs
 * Cleans the data
 * Broadcasts to the internal bot's websocket
 */

const ws = require('ws')
const moment = require('moment')
const util = require('util')
const request = require('request')
const _ = require('underscore')
var w;

/**************** Bitfitnex WebSocket Configs ******************/
const mapping = require('./mapping')    
/***************************************************************/

/**************** WebSocket Client *****************/
var connection;
const URL = 'http://localhost:3001/api/'
var destId = '';
/***************************************************/



startWS_TO_BITFITNEX()
startWS_TO_LOCAL()
/**
 * Internal WebSocket
 */
function startWS_TO_LOCAL() {
    connection = new ws('ws://127.0.0.1:1337');

    connection.on('open', ()=> {
        console.log('Client [public] started, listening to WebSocket 127.0.0.1:1337')
    })
    
    connection.on('message', (msg)=> {
        var msg_parsed = JSON.parse(msg);
        // console.log('Recieved message: ' + msg_parsed)

       
        if (msg_parsed.hasOwnProperty('id')) {
            destId = msg_parsed.id;
            console.log('Received client [bot]\'s id: ' + msg_parsed.id)
        }
    })
    connection.on('close', () => {
        util.log('Identified connection to socket [public] closed, reopening')
        w.on('close', () => {});
        w.close();
        startWS_TO_LOCAL();
        startWS_TO_BITFITNEX();
    })
}

const broadcast = (data, ticker, datasource) => {
    if (destId != '') {
        var data = {
            to: destId,
            message: {
                data: data,
                ticker: ticker,
                datasource: datasource
            }
        }
        connection.send(JSON.stringify(data)) 
    }
}

/**
 * BitFinex WebSocket
 */
function startWS_TO_BITFITNEX() {
    w = new ws('wss://api.bitfinex.com/ws/2')
    w.setMaxListeners(27)
    for (var i  = 0; i < mapping.length; i++) {
        let msg = (mapping[i]);
        util.log(msg)
        w.on('open', () => w.send(JSON.stringify(msg)))
    }

    let event = ({
        event: 'ping'
    })

    var storage = {}

    w.on('message', (msg) => {
        msg = JSON.parse(msg)
        if (msg.hasOwnProperty('event') && msg.event === 'info') {
            var code = msg.code;
            var msg_data = msg.msg;

            util.log(`--------------------------------------\nINFO: ${code} \n${msg_data}\n--------------------------------------`)
            if (code === '20051') {
                util.log('*********************************** RESTARTING BITFINEX WEBSOCKET SERVER *****************************')
                w.close();
            }
            if (code ==='20061') {
                w.on('close', ()=> {});
                w.close();
                setTimeout(()=> {startWS_TO_BITFITNEX()}, 120 * 1000);
            }
        }

        // Parse the channel id and store the ticker/id mapping in memory
        if ('event' in msg === true && msg.event === 'subscribed') {
            // ticker
            if (msg.channel === 'ticker') {
                storage[msg.chanId] = {
                    'ticker': msg.pair,
                    'datasource' : 'ticker'
                }
            }
            // books
            else if (msg.channel === 'book') {
                storage[msg.chanId] = {
                    'ticker': msg.symbol,
                    'datasource' : 'book'
                }
            }

            // candle
            else if (msg.channel === 'candles') {
                storage[msg.chanId] = {
                    'ticker': msg.key,
                    'datasource' : 'candles'
                }
            }
        }
            
        // console.log(msg)
        // util.log(storage)
        if ('event' in msg === false) {
            var channelId = msg[0];
            if (msg[1] != 'hb') {

                // console.log(storage[channelId].datasource)
                // util.log('Fetching prices')
                // handleBooks(msg[1], storage[channelId])
                broadcast(msg[1], storage[channelId].ticker, storage[channelId].datasource)
            }
        }
    })
    w.on('close', ()=> {
        startWS_TO_BITFITNEX()
    })
}






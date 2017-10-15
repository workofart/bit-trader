/**
 * This file contains the websocket connections to Bitfinex APIs
 * Cleans the data
 * Broadcasts to the internal bot's websocket
 */
const io = require('socket.io-client');
const io_server = require('socket.io');
const parser = require('socket.io-json-parser')
// const server = require('http').createServer();

const socket_bitfinex = io('wss://api.bitfinex.com/ws/2', {
    'reconnection' : true,
    'reconnectionDelay' : 500,
    'reconnectionAttempts' : 10
})
// const socket_local = io_server(server, {
//     'pingInterval': 1000,
//     'pingTimeout': 5000
// })
// server.listen(1338);

const moment = require('moment')
const util = require('util')
const request = require('request')
const _ = require('underscore')


/**************** Bitfitnex WebSocket Configs ******************/
const mapping = require('./mapping')    
/***************************************************************/

/**************** WebSocket Client *****************/
const URL = 'http://127.0.0.1:3001/api/'
var destId = '';
/***************************************************/

// w.setMaxListeners(27)

// startWS_TO_BITFITNEX()
// startWS_TO_LOCAL()


/**
 * Internal WebSocket
 */
// function startWS_TO_LOCAL() {
    

//     socket_local.on('open', ()=> {
//         console.log('Client [public] started, listening to WebSocket 127.0.0.1:1337')
//     })
    
//     socket_local.on('message', (msg)=> {
//         var msg_parsed = JSON.parse(msg);
//         // console.log('Recieved message: ' + msg_parsed)
//         if (msg_parsed.hasOwnProperty('id')) {
//             destId = msg_parsed.id;
//             console.log('Received client [bot]\'s id: ' + msg_parsed.id)
//         }
//     })
//     socket_local.on('disconnect', (reason) => {
//         util.log(`Server lost client: ${reason}`)
        
//     })
// }

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
util.log('Prepare to connect to bitfinex....')
// socket_bitfinex.open();


let event = ({
    event: 'ping'
})

var storage = {}

socket_bitfinex.on('message', (msg) => {
    msg = JSON.parse(msg)
    util.log(`ONMESSAGE: ${msg}`);

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

socket_bitfinex.on('connect', () => {
    socket_bitfinex.emit('ping');
    util.log('Connected to bitfinex websocket')
    for (var i  = 0; i < mapping.length; i++) {
        let msg = (mapping[i]);
        util.log(msg)
        socket_bitfinex.send(JSON.stringify(msg))
    }
})

socket_bitfinex.on('error', (err) => {
    util.log('Error: ' + JSON.stringify(err));
})

socket_bitfinex.on('connect_error', (err) => {
    util.log('Error: ' + JSON.stringify(err));
})

socket_bitfinex.on('reconnect_error', (err) => {
    util.log('Error: ' + JSON.stringify(err));
})

socket_bitfinex.on('reconnect', (attemptNumber)=> {
    util.log(`Reconnected after ${attemptNumber} tries`)
})

socket_bitfinex.on('reconnecting',  (attemptNumber)=> {
    util.log(`Attempting to reconnect ... ${attemptNumber}`)
})




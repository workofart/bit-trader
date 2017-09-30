const ws = require('ws')
const moment = require('moment')
const util = require('util')
const request = require('request')
const w = new ws('wss://api.bitfinex.com/ws/2')

/**************** Configs ******************/
const mapping = require('./mapping_ticker')
/******************************************/

/**************** WebSocket Client *****************/
const URL = 'http://127.0.0.1:3001/api/'
var destId = '';
const connection = new ws('ws://127.0.0.1:1337');
/***************************************************/
connection.on('open', ()=> {
    console.log('Client [public_books] started, listening to WebSocket 127.0.0.1:1337')
})


for (var i  = 0; i < mapping.length; i++) {
    let msg = (mapping[i]);
    // util.log(msg)
    w.on('open', () => w.send(JSON.stringify(msg)))
}


let event = ({
    event: 'ping'
})


connection.on('message', (msg)=> {
    var msg_parsed = JSON.parse(msg);
    console.log('Recieved message: ' + msg_parsed)
    if (msg_parsed.hasOwnProperty('id')) {
        destId = msg_parsed.id;
        console.log('Received client [bot]\'s id: ' + msg_parsed.id)
    }
})

var storage = {}


w.on('message', (msg) => {
    msg = JSON.parse(msg)

    // Parse the channel id and store the ticker/id mapping in memory
    if ('event' in msg === true && msg.event === 'subscribed') {
        storage[msg.chanId] = msg.pair
    }

    // util.log(storage)
    // console.log(msg)
    if ('event' in msg === false) {
        var channelId = msg[0];
        if (msg[1] != 'hb') {
            // util.log('Fetching prices')
            // handleTickerPrice(msg[1], storage[channelId])
            broadcast(msg[1], storage[channelId])
        }
    }
})


const broadcast = (price, ticker) => {
    if (destId != '') {
        var data = {
            to: destId,
            message: {price: price, ticker: ticker}
        }
        connection.send(JSON.stringify(data)) 

    }
}

const handleTickerPrice = (prices, ticker) => {
    var ticker = ticker
    var bid = prices[0]
    var bid_size = prices[1]
    var ask = prices[2]
    var ask_size = prices[3]
    var daily_change = prices[4]
    var daily_change_perc = prices[5]
    var last_price = prices[6]
    var volume = prices[7]
    var high = prices[8]
    var low = prices[9]

    var json_body = {
        ticker: ticker, 
        bid: bid, 
        bid_size: bid_size, 
        ask: ask, 
        ask_size: ask_size, 
        daily_change: daily_change, 
        daily_change_perc: daily_change_perc, 
        last_price: last_price, 
        low: low, 
        high: high, 
        volume: volume
    }

    // util.log(json_body)

    url = URL + 'insertTickerPrice'
    request.post(url,
        {
            json: json_body
        },
        function(err, response, body) {
            if (err) {
                util.error(err)
            }
            else {
                // util.log(body)
            }
        })


}

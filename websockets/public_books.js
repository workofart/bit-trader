const ws = require('ws')
const moment = require('moment')
const util = require('util')
const request = require('request')
const w = new ws('wss://api.bitfinex.com/ws/2')

/**************** Configs ******************/
const mapping = require('./mapping_books')
/******************************************/

/**************** WebSocket Client *****************/
const connection = new ws('ws://127.0.0.1:1337');
const URL = 'http://127.0.0.1:3001/api/'
var destId = '';
/***************************************************/

connection.on('open', ()=> {
    console.log('Client [public_books] started, listening to WebSocket 127.0.0.1:1337')
})


connection.on('message', (msg)=> {
    var msg_parsed = JSON.parse(msg);
    console.log('Recieved message: ' + msg_parsed)
    if (msg_parsed.hasOwnProperty('id')) {
        destId = msg_parsed.id;
        console.log('Received client [bot]\'s id: ' + msg_parsed.id)
    }
})

// let ticker = 'BTCUSD'
for (var i  = 0; i < mapping.length; i++) {
    let msg = (mapping[i]);
    util.log(msg)
    w.on('open', () => w.send(JSON.stringify(msg)))
}


let event = ({
    event: 'ping'
})


var storage = {}

// w.on('open', () => w.send(JSON.stringify(msg)))
// w.on('open', () => w.send(JSON.stringify(msg1)))

w.on('message', (msg) => {
    msg = JSON.parse(msg)

    // Parse the channel id and store the ticker/id mapping in memory
    if ('event' in msg === true && msg.event === 'subscribed') {
        storage[msg.chanId] = msg.pair
    }
        
        // console.log(msg)
    // util.log(storage)
    if ('event' in msg === false) {
        var channelId = msg[0];
        if (msg[1] != 'hb') {
            // util.log('Fetching prices')
            // handleBooks(msg[1], storage[channelId])
            broadcast(msg[1], storage[channelId])
        }
    }
})


const broadcast = (books, ticker) => {
    if (destId != '') {
        var data = {
            to: destId,
            message: {books: books, ticker: ticker}
        }
        connection.send(JSON.stringify(data)) 

    }
}

const handleBooks = (books, ticker) => {
    if (books.length > 3) {
        for (var i = 0; i < books.length; i++) {
            if (books[i].length === 3) {
                var timeStamp = moment()
                var price = books[i][0]
                var count = books[i][1]
                var amount = books[i][2]
    
                var json_body = {
                    ticker: ticker,
                    timestamp: timeStamp.format('YYYY-MM-DD HH:mm:ss'),
                    price: price,
                    count: count,
                    amount: amount

                }
                // util.log(json_body)
    
                url = URL + 'insertBooks'
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
        }
    }
    else {
        // console.log(books.length)
        var timeStamp = moment()
        var price = books[0]
        var count = books[1]
        var amount = books[2]

        var json_body = {
            ticker: ticker,
            timestamp: timeStamp.format('YYYY-MM-DD HH:mm:ss'),
            price: price,
            count: count,
            amount: amount

        }
        // util.log(json_body)

        url = URL + 'insertBooks'
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
    
}

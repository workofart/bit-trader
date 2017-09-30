const ws = require('ws')
const moment = require('moment')
const util = require('util')
const request = require('request')
const w = new ws('wss://api.bitfinex.com/ws/2')

/**************** Configs ******************/
const mapping = require('./mapping_candle')
/******************************************/
const URL = 'http://127.0.0.1:3001/api/'


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
        storage[msg.chanId] = msg.key.substr(msg.key.length - 6)
    }

    // util.log(storage)
    // console.log(msg)
    if ('event' in msg === false) {
        var channelId = msg[0];
        if (msg[1] != 'hb') {
            // util.log('Fetching prices')
            handleCandles(msg[1], storage[channelId])
        }
    }
})




const handleCandles = (candles, ticker) => {
    if (candles.length > 6) {
        for (var i = 0; i < candles.length; i++) {
            if (candles[i].length === 6) {
                var timeStamp = moment(candles[i][0])
                var open = candles[i][1]
                var close = candles[i][2]
                var high = candles[i][3]
                var low = candles[i][4]
                var volume = candles[i][5]
    
                var json_body = {
                    ticker: ticker,
                    open: open,
                    close: close,
                    low: low,
                    high: high,
                    volume: volume,
                    timestamp: timeStamp.local().format('YYYY-MM-DD HH:mm:ss')
                }
                // util.log(json_body)
    
                url = URL + 'insertCandlePrice'
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
        var timeStamp = moment(candles[0])
        var open = candles[1]
        var close = candles[2]
        var high = candles[3]
        var low = candles[4]
        var volume = candles[5]

        var json_body = {
            ticker: ticker,
            open: open,
            close: close,
            low: low,
            high: high,
            volume: volume,
            timestamp: timeStamp.local().format('YYYY-MM-DD HH:mm:ss')
        }
        // util.log(json_body)

        url = URL + 'insertCandlePrice'
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

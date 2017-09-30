const creds = require('../config/creds');
const crypto = require('crypto-js')

const apiKey = creds.key;
const apiSecret = creds.secret;

const authNonce = Date.now() * 1000
const authPayload = 'AUTH' + authNonce,
authSig = crypto
.HmacSHA384(authPayload, apiSecret)
.toString(crypto.enc.Hex)

const payload = {
    apiKey,
    authSig,
    authNonce,
    authPayload,
    event: 'auth'
}

// w.on('open', () => w.send(JSON.stringify(payload)))
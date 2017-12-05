global.chai = require('chai');
global.expect = chai.expect;
chai.use(require('chai-as-promised'));

global.currencyWallet = {
    btcusd: {
        price: 10,
        qty: 1
    }
}

global.wallet = 10;



require('../algo/init/init');
global.chai = require('chai');
global.expect = global.chai.expect;
global.chai.use(require('chai-as-promised'));

global.currencyWallet = {
    btcusd: {
        repeatedBuyPrice: 10,
        price: 10,
        qty: 1
    }
}

global.wallet = 10;



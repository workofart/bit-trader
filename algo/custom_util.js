const util = require('util'),
      _ = require('underscore');
const { INITIAL_INVESTMENT } = require('./constants').investment;


const printWalletStatus = () => {
    let currencyValue = 0;
    
    for (let i in global.currencyWallet) {
        currencyValue += global.currencyWallet[i].qty * global.latestPrice[i]
    }

    util.log(`-------------------- Summary ----------------------------`);
    util.log(`Currency Wallet: ${JSON.stringify(global.currencyWallet, null, 2)}`);
    util.log(`Starting Value: ${INITIAL_INVESTMENT}`);
    util.log(`---------------------------------`);
    util.log(`  Market Value: $ ${currencyValue.toFixed(2)}`);
    util.log(`+ Fiat Wallet:  $ ${global.wallet.toFixed(2)}`);
    util.log(`= Total Value:  $ ${(currencyValue + global.wallet).toFixed(2)}`);
    util.log('---------------------------------------------------------\n\n');
}

const printPNL = () => {
    let currencyValue = 0;

    for (let i in global.currencyWallet) {
        currencyValue += global.currencyWallet[i].qty * global.latestPrice[i];
    }

    let numCoins = 0;
    _.forEach(global.currencyWallet, (coin) => {
       if (coin.qty > 0) {
           numCoins++;
       }
    });

    // console.log(`Starting Value: $${INITIAL_INVESTMENT}`);
    let profit = currencyValue + global.wallet - INITIAL_INVESTMENT;
    console.log(`Holding [${numCoins}] coins | $${profit.toFixed(2)} | ${(profit / INITIAL_INVESTMENT * 100).toFixed(2)}%`);

};

const printBuyHold = () => {

};

const printSell = (ticker, price) => {
    util.log(`************ Sell | ${global.currencyWallet[ticker].qty} [${ticker}] @ ${price}`);
};

const printBuy = (ticker, qty, price) => {
    util.log(`************* Buy | ${qty} [${ticker}] @ ${price} *************`);
};

const printBacktestSummary = () => {
    console.log('------------- Investment Parameters --------------');
    console.log(JSON.stringify(require('./constants').investment, null, 2));
    console.log('------------- Indicators Parameters --------------');
    console.log(JSON.stringify(require('./parameters'), null, 2));
    console.log('------------- PNL Performance --------------');
    printPNL();
}

module.exports = {
    printPNL: printPNL,
    printBacktestSummary: printBacktestSummary,
    printBuy: printBuy,
    printSell: printSell,
    printWalletStatus: printWalletStatus,
    printBuyHold: printBuyHold
}
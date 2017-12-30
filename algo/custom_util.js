const util = require('util');
const { INITIAL_INVESTMENT } = require('./constants').investment;


exports.printWalletStatus = () => {
    let currencyValue = 0;
    
    for (let i in currencyWallet) {
        currencyValue += currencyWallet[i].qty * global.latestPrice[i]
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

exports.printPNL = () => {
    let currencyValue = 0;

    for (let i in currencyWallet) {
        currencyValue += currencyWallet[i].qty * latestPrice[i];
    }

    // console.log(`Starting Value: $${INITIAL_INVESTMENT}`);
    let profit = currencyValue + global.wallet - INITIAL_INVESTMENT;
    console.log(`Current Profit/Loss: $${profit.toFixed(2)} | ${(profit / INITIAL_INVESTMENT * 100).toFixed(2)}%`);

};
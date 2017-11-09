const util = require('util');


exports.printWalletStatus = (INITIAL_INVESTMENT, wallet, currencyWallet, latestPrice) => {
    var currencyValue = 0;
    
    for (var i in currencyWallet) {
        currencyValue += currencyWallet[i].qty * latestPrice[i]
    }

    util.log(`-------------------- Summary ----------------------------`)
    util.log(`Currency Wallet: ${JSON.stringify(currencyWallet, null, 2)}`)
    util.log(`Starting Value: ${INITIAL_INVESTMENT}`)
    util.log(`---------------------------------`)
    util.log(`  Market Value: $ ${currencyValue.toFixed(2)}`)
    util.log(`+ Fiat Wallet:  $ ${wallet.toFixed(2)}`)
    util.log(`= Total Value:  $ ${(currencyValue + wallet).toFixed(2)}`)
    util.log('---------------------------------------------------------\n\n')
}
const util = require('util'),
      _ = require('underscore');


const printWalletStatus = () => {
    if (!global.isBacktest) {
        let currencyValue = 0;

        for (let i in global.currencyWallet) {
            currencyValue += global.currencyWallet[i].qty * global.latestPrice[i]
        }

        util.log(`-------------------- Summary ----------------------------`);
        util.log(`Currency Wallet: ${JSON.stringify(global.currencyWallet, null, 2)}`);
        util.log(`Starting Value: ${global.INITIAL_INVESTMENT}`);
        util.log(`---------------------------------`);
        util.log(`  Market Value: $ ${currencyValue.toFixed(2)}`);
        util.log(`+ Fiat Wallet:  $ ${global.wallet.toFixed(2)}`);
        util.log(`= Total Value:  $ ${(currencyValue + global.wallet).toFixed(2)}`);
        util.log('---------------------------------------------------------\n\n');
    }
}

const printPNL = () => {
    // if (!global.isParamTune) {
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
        let profit = currencyValue + global.wallet - global.INITIAL_INVESTMENT;
        console.log(`Holding [${numCoins}] coins | $${profit.toFixed(2)} | ${(profit / global.INITIAL_INVESTMENT * 100).toFixed(2)}%`);
        // console.log(`CurrencyValue: ${currencyValue}`);
        // console.log(`WalletValue: ${global.wallet}`);
        return (profit / global.INITIAL_INVESTMENT * 100).toFixed(2);
    // }
};

const printBuyHold = () => {

};

const printSell = (ticker, price) => {
    !global.isParamTune && util.log(`************ Closed Long | ${global.currencyWallet[ticker].qty} [${ticker}] @ ${price} *************`);
};

const printBearSell = (ticker, qty, price) => {
    !global.isParamTune && util.log(`************ Bear Sell | ${qty} [${ticker}] @ ${price} *************`);
};

const printShort = (ticker, qty, price) => {
    !global.isParamTune && util.log(`************* Short | ${qty} [${ticker}] @ ${price} *************`);
};


const printBuy = (ticker, qty, price) => {
    !global.isParamTune && util.log(`************* Long | ${qty} [${ticker}] @ ${price} *************`);
};

const printBacktestSummary = () => {
    console.log('Investment Parameters');
    console.log(`\tInvest %: ${global.INVEST_PERCENTAGE * 100}%\n\tProfit %: ${global.MIN_PROFIT_PERCENTAGE * 100}%\n\tRepeatedBuy: ${global.REPEATED_BUY_MARGIN * 100}%`);
    console.log(`\tBearSell: ${global.BEAR_SELL_PERCENTAGE * 100}%\n\tBearLoss: ${global.BEAR_LOSS_START * 100}%`);
    console.log('Indicators Parameters');
    console.log(`\tRSI: ${global.RSI}\n\tBB_STD_DEV: ${global.BB_STD_DEV}\n\tLOWER_RSI: ${global.LOWER_RSI}\n\tUPPER_RSI: ${global.UPPER_RSI}\n\tCORRELATION_PERIOD: ${global.CORRELATION_PERIOD}`);
    // console.log('------------- PNL Performance --------------');
    let profit = printPNL();
    return profit;
}

module.exports = {
    printPNL: printPNL,
    printBacktestSummary: printBacktestSummary,
    printBuy: printBuy,
    printSell: printSell,
    printShort: printShort,
    printWalletStatus: printWalletStatus,
    printBuyHold: printBuyHold,
    printBearSell: printBearSell
}
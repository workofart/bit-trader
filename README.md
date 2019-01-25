# Bit-trader - Automated Crypto-currency trading bot
> Based on technical indicators and currently supports the [Bitfinex](https://www.bitfinex.com/) and [Binance](https://www.binance.com/en) exchanges

## Backtesting Demo:
![Demo](https://raw.githubusercontent.com/workofart/bit-trader/master/backtest-demo.gif)

## Branches 
**Current Master Branch is for Binance Exchange**

Temporary Branches for different versions:
  - Binance Exchange arbitrage bot (cloud): https://github.com/workofart/bit-trader/tree/binance-arbitrage
  - Binance Exchange bot (cloud): https://github.com/workofart/bit-trader/tree/binance-cloud
  - Bitfinex Exchange Bot (local): https://github.com/workofart/bit-trader/tree/bitfinex
  
## Installing / Getting started

1. Install all the dependencies for the *bot* and create the necessary log folder.

    ```shell
    npm install
    mkdir logs
    ```

2. Install all the dependencies for the back-testing *client*.
    ```shell
    cd client
    npm install
    ```

3. Install [Postgresql](https://www.postgresql.org/download/) and configure the DB connection in
    ```
    db/config.js
    ```

4. Run the DB script to create the necessary tables
    ```shell
    psql -d portfolio-manager -a -f db/db_createtable.sql
    ```

5. Define tickers/coin-pairs that you want to trade in
    ```
    websockets/mapping_binance.json
    ```


### Initial Configuration

Before running the bot, we need to make sure the exchange API keys are properly defined in:

```
config/creds.json   ---> for bitfinex on bitfinex branch
```
or
```
config/creds_binance.json   ---> for binance on master branch
```

## Developing

```shell
git clone https://github.com/workofart/bit-trader.git
cd bit-trader
```


Note that [Tulind](https://github.com/TulipCharts/tulipnode) needs to be installed separately as there are **no pre-built binaries** for certain OS, check [here](https://github.com/TulipCharts/tulipnode#installation) for more details.

```shell
npm install tulind --build-from-source
npm install
```


### Deploying / Publishing (**Active-Work-In-Progress**)

Currently, the following manual changes have to be made to be compatible with a non-local/cloud environment.


```
client/package.json
    ---> "proxy": "http://IP_OF_YOUR_SERVER:3000/"

client/src/App.js
    ---> const URL = 'http://IP_OF_YOUR_SERVER:3001/api/'

client/src/components/charts/price.js
    ---> const URL = 'http://IP_OF_YOUR_SERVER:3001/api/'

db/config.js
    ---> password: 'YOUR_DB_PASSWORD'

package.json
    ---> "proxy": "http://IP_OF_YOUR_SERVER:3001/"

server.js
    ---> app.use((req, res, next) => {	app.use((req, res, next) => {
         res.setHeader('Access-Control-Allow-Origin', 'http://IP_OF_YOUR_SERVER:3000');
```


## Features

As with any automated trading bot you can run this 24/7 locally or on a server and hope that the out-of-the-box algorithms can bring you profit. At the same time, it includes following:

* [Back-test Visualization Tool]((localhost:3001)) to visualize the trades the bot took to spot trading logic improvements
* Currently, the bot takes in ticker prices (high,low,price,volume) (10-sec intervals) and performs technical analysis using the following indicators:
    * Bollinger-bands (BB)
    * Relative Strength Index (RSI)
    * Correlation Analysis (among different coin pairs)
    * Average Directional Index (ADI)

Disabled Features (can be enabled with a simple flag switch or minor changes)
* Orderbook runner to ensure your orders always stay at the top of the book (to reap the benefits of lower market-making fees and priorty order execution)
* Candle-stick data processor
* Orderbook data processor

## Configuration

Trading related configurations:
```
algo/init/parameters.json
algo/init/constants.js
```

System related configurations:
```
db/config.js
package.json
client/package.json
```
Exchange related configurations:
```
config/creds.json
config/creds_binance.json
websockets/mapping_binance.json
```

Testing related configurations:
```
test/env-setup.js
```

## Links

- Repository: https://github.com/workofart/bit-trader
- Issue tracker: https://github.com/workofart/bit-trader/issues
- Temporary Branches for different versions:
  - Binance Exchange arbitrage bot (cloud): https://github.com/workofart/bit-trader/tree/binance-arbitrage
  - Binance Exchange bot (cloud): https://github.com/workofart/bit-trader/tree/binance-cloud
  - Bitfinex Exchange Bot (local): https://github.com/workofart/bit-trader/tree/bitfinex


## Licensing

MIT License

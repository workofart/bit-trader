const express = require('express');

const router = express.Router();

const dbController = require('./db'),
    configController = require('./config');


/** *******************************************************
 *                  DB APIs
 ******************************************************** */

router.post('/insertCandlePrice', dbController.insertCandlePrice);
router.post('/insertTickerPrice', dbController.insertTickerPrice);
router.post('/insertBooks', dbController.insertBooks);

router.get('/getCandlePrice/:ticker', dbController.getCandlePrice);
router.get('/getTickerPrice/:ticker', dbController.getTickerPrice);
router.get('/getBooks/:ticker', dbController.getBooks);

router.get('/getBotTradesByTicker/:ticker', dbController.getBotTradesByTicker);
router.get('/getTradedTickers', dbController.getTradedTickers);
router.get('/getLivePrices/:ticker', dbController.getLivePrices);
router.get('/getWalletState', dbController.getWalletState);
// router.get('/getLiveWallet', db_controller.getLiveWallet);
router.get('/resetLivePriceFlag', dbController.resetLivePriceFlag);

/** *******************************************************
 * 					Configuration APIs
 ******************************************************* */
router.get('/getTradingConfigs', configController.getTradingConfigs);
router.put('/updateTradingConfigs', configController.updateTradingConfigs);

module.exports = router;

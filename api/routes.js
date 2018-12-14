const express = require('express');

const router = express.Router();

const dbController = require('./db'),
    configController = require('./config');


/** *******************************************************
 *                  DB APIs
 ******************************************************** */
router.get('/getBotTradesByTicker/:ticker', dbController.getBotTradesByTicker);
router.get('/getTradedTickers', dbController.getTradedTickers);
router.get('/getLivePrices/:ticker', dbController.getLivePrices);
router.get('/getWalletState', dbController.getWalletState);
// router.get('/getLiveWallet', db_controller.getLiveWallet);
router.get('/resetLivePriceFlag', dbController.resetLivePriceFlag);

/** *******************************************************
 *         Configuration APIs (Currently Not Used)
 ******************************************************* */
router.get('/getTradingConfigs', configController.getTradingConfigs);
router.put('/updateTradingConfigs', configController.updateTradingConfigs);

module.exports = router;

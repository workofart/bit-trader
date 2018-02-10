const express = require('express');
var router = express.Router();

var public_controller = require('./public');
var user_controller = require('./user');
var db_controller = require('./db');



/*********************************************************
 *                  Account Info APIs
 *********************************************************/
router.get('/getAccountInfo', user_controller.getAccountInfo);
router.get('/getTradingSummary', user_controller.getTradingSummary);
router.get('/getMarginSummary', user_controller.getMarginSummary);
router.get('/getWalletBalance', user_controller.getWalletBalance);
router.get('/getLedgerEntries', user_controller.getLedgerEntries);


/*********************************************************
 *                  Order/Trade APIs
 *********************************************************/
router.get('/getActivePositions', user_controller.getActivePositions);
router.get('/getPastTrades', user_controller.getPastTrades);

/*********************************************************
 *                  Public APIs
 *********************************************************/
router.get('/getPriceByTicker/:ticker', public_controller.getPriceByTicker);
router.get('/getVolumeByTicker/:ticker', public_controller.getVolumeByTicker);
router.get('/getTradesByTicker/:ticker', public_controller.getTradesByTicker);
router.get('/getOrdersByTicker/:ticker', public_controller.getOrdersByTicker);

router.get('/getAllTradingPairs', public_controller.getAllTradingPairs);
router.get('/getPairStats', public_controller.getPairStats);

/*********************************************************
 *                  DB APIs
 *********************************************************/

router.post('/insertCandlePrice', db_controller.insertCandlePrice);
router.post('/insertTickerPrice', db_controller.insertTickerPrice);
router.post('/insertBooks', db_controller.insertBooks);

router.get('/getCandlePrice/:ticker', db_controller.getCandlePrice);
router.get('/getTickerPrice/:ticker', db_controller.getTickerPrice);
router.get('/getBooks/:ticker', db_controller.getBooks);

router.get('/getBotTrades/:ticker', db_controller.getBotTrades);
router.get('/getLivePrices/:ticker', db_controller.getLivePrices);
router.get('/getWalletState', db_controller.getWalletState);
// router.get('/getLiveWallet', db_controller.getLiveWallet);
router.get('/resetLivePriceFlag', db_controller.resetLivePriceFlag);
module.exports = router;

const express = require('express');
var router = express.Router();

var db_controller = require('./db');


/*********************************************************
 *                  Order/Trade APIs
 *********************************************************/
router.get('/getActivePositions', user_controller.getActivePositions);
router.get('/getPastTrades', user_controller.getPastTrades);

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

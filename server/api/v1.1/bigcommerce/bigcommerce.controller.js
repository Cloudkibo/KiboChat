/**
 * Created by sojharo on 27/07/2017.
 */

const logger = require('../../../components/logger')
const config = require('./../../../config/environment/index')
const TAG = 'api/bigcommerce/bigcommerce.controller.js'
const dataLayer = require('./bigcommerce.datalayer')
const EcommerceProviders = require('./../ecommerceProvidersApiLayer/EcommerceProvidersApiLayer.js')
const commerceConstants = require('./../ecommerceProvidersApiLayer/constants')
const { sendSuccessResponse, sendErrorResponse } = require('../../global/response')
const path = require('path')
const BigCommerce = require('node-bigcommerce')
const bigCommerce = new BigCommerce({
  clientId: config.bigcommerce.client_id,
  secret: config.bigcommerce.app_secret,
  callback: `${config.domain}/api/bigcommerce/install`,
  responseType: 'json'
})

exports.install = function (req, res) {
  bigCommerce.authorize(req.query)
    .then(data => {
      res.cookie('bigCommerceAuthPayload', JSON.stringify(data))
      res.cookie('bigCommerceSetupState', 'startedFromApp')
      res.sendFile(path.join(__dirname, '/proceedToIntegratePage.html'))
    })
    .catch(err => {
      logger.serverLog(TAG, `bigcommerce installation error ${JSON.stringify(err)}`, 'error')
      res.sendFile(path.join(__dirname, '/errorPage.html'))
    })
}

exports.load = function (req, res) {
  const bigCom = new BigCommerce({
    secret: config.bigcommerce.app_secret,
    responseType: 'json'
  })
  try {
    bigCom.verify(req.query['signed_payload'])
    res.sendFile(path.join(__dirname, '/welcome.html'))
  } catch (err) {
    res.sendFile(path.join(__dirname, '/errorPage.html'))
  }
}

exports.uninstall = (req, res) => {
  const bigCom = new BigCommerce({
    secret: config.bigcommerce.app_secret,
    responseType: 'json'
  })
  try {
    bigCom.verify(req.query['signed_payload'])
    res.status(200).send({ message: 'Success' })
  } catch (err) {
    res.status(501).send({ message: `Internal Server Error ${JSON.stringify(err)}` })
  }
}

exports.fetchStore = (req, res) => {
  dataLayer.findOneBigCommerceIntegration({ companyId: req.user.companyId })
    .then(bigCommerceIntegration => {
      const bigCommerce = new EcommerceProviders(commerceConstants.bigcommerce, {
        shopToken: bigCommerceIntegration.shopToken,
        storeHash: bigCommerceIntegration.payload.context
      })
      return bigCommerce.fetchStoreInfo()
    })
    .then(shop => {
      sendSuccessResponse(res, 200, shop)
    })
    .catch(err => {
      sendErrorResponse(res, 500, `Failed to fetch shop info ${JSON.stringify(err)}`)
    })
}

exports.testRoute = (req, res) => {
  dataLayer.findOneBigCommerceIntegration({ companyId: req.user.companyId })
    .then(bigCommerceIntegration => {
      const bigCommerce = new EcommerceProviders(commerceConstants.bigcommerce, {
        shopToken: bigCommerceIntegration.shopToken,
        storeHash: bigCommerceIntegration.payload.context
      })
      return bigCommerce.createOrder('78edeeeb-3504-41ee-86e5-72eb7b8e686a')
      // return bigCommerce.createPermalinkForCartBigCommerce('78edeeeb-3504-41ee-86e5-72eb7b8e686a')
      // return bigCommerce.updateCart('78edeeeb-3504-41ee-86e5-72eb7b8e686a', 'edbd622d-4302-4aa0-9735-88e6977b3335', 77, 3)
      // return bigCommerce.createCart(
      //   // created with id 78edeeeb-3504-41ee-86e5-72eb7b8e686a
      //   1,
      //   [{
      //     product_id: 77,
      //     quantity: 1,
      //     variant_id: 1
      //   }]
      // )
    })
    .then(shop => {
      sendSuccessResponse(res, 200, shop)
    })
    .catch(err => {
      console.log(err)
      sendErrorResponse(res, 500, `Failed to fetch subscribers
      ${JSON.stringify(err)}`)
    })
}

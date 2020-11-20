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
      const message = err || 'bigcommerce installation error'
      logger.serverLog(message, `${TAG}: exports.install`, {}, {query: req.query}, 'error')
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
    const message = err || 'bigcommerce load page error'
    logger.serverLog(message, `${TAG}: exports.load`, {}, {query: req.query}, 'error')
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
    const message = err || 'Internal Server Error on verifying bigcom'
    logger.serverLog(message, `${TAG}: exports.uninstall`, {}, {query: req.query}, 'error')
    res.status(501).send({ message: `Internal Server Error ${JSON.stringify(err)}` })
  }
}

exports.redirect = function (req, res) {
  res.sendFile(path.join(__dirname, '/redirect.html'))
}

exports.fetchStore = (req, res) => {
  dataLayer.findOneBigCommerceIntegration({ companyId: req.user.companyId })
    .then(bigCommerceIntegration => {
      if (bigCommerceIntegration) {
        const bigCommerce = new EcommerceProviders(commerceConstants.bigcommerce, {
          shopToken: bigCommerceIntegration.shopToken,
          storeHash: bigCommerceIntegration.payload.context
        })
        return bigCommerce.fetchStoreInfo()
      } else {
        return null
      }
    })
    .then(shop => {
      sendSuccessResponse(res, 200, shop)
    })
    .catch(err => {
      const message = err || 'Failed to fetch shop info'
      logger.serverLog(message, `${TAG}: exports.fetchStore`, {}, {user: req.user}, 'error')
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
      // return bigCommerce.getVariantsOfSelectedProduct(112)
      // return bigCommerce.createOrder('78edeeeb-3504-41ee-86e5-72eb7b8e686a')
      // return bigCommerce.findCustomerOrders(1, 10)
      return bigCommerce.createPermalinkForCartBigCommerce('33ff1896-dfa9-47dd-8701-b49a48393ab7')
      // return bigCommerce.updateCart('33ff1896-dfa9-47dd-8701-b49a48393ab7', 'edbd622d-4302-4aa0-9735-88e6977b3335', 77, 3)
      // return bigCommerce.createCart(
      //   // created with id 33ff1896-dfa9-47dd-8701-b49a48393ab7
      //   3,
      //   [{
      //     product_id: 112,
      //     quantity: 1,
      //     variant_id: 78
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

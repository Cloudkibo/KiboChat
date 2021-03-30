/**
 * Created by sojharo on 27/07/2017.
 */

'use strict'

const express = require('express')

const router = express.Router()
const auth = require('../../../auth/auth.service')
const controller = require('./shopify.controller')
// const webhook = require('./webhook.controller')

router.post('/',
  auth.isAuthenticated(),
  auth.isSuperUserActingAsCustomer('write'),
  controller.index) // this id will be userid

router.get('/install', // handle installing of app from shopify app store
  controller.install)

router.get('/callback',
  controller.callback) // this id will be userid

router.post('/app-uninstall',
  controller.handleAppUninstall) // this id will be userid

router.post('/complete-checkout',
  controller.handleCompleteCheckout)

router.post('/checkout-create',
  controller.handleCreateCheckout)

router.post('/fulfillment',
  controller.handleFulfillment)

router.get('/fetchStore',
  auth.isAuthenticated(),
  auth.isSuperUserActingAsCustomer(),
  controller.fetchStore)

router.post('/fetchCheckouts',
  auth.isAuthenticated(),
  auth.isSuperUserActingAsCustomer(),
  controller.fetchCheckouts)

router.post('/gdpr/erasecustomer',
  controller.eraseCustomerData) // this id will be userid

router.post('/gdpr/eraseshop',
  controller.eraseShopData) // this id will be userid

router.post('/gdpr/getcustomerdata',
  controller.getCustomerData) // this id will be userid

router.get('/testRoute',
  auth.isAuthenticated(),
  auth.isSuperUserActingAsCustomer(),
  controller.testRoute) // this id will be userid

router.post('/fetchOrders',
  auth.isAuthenticated(),
  auth.isSuperUserActingAsCustomer(),
  controller.fetchOrders)

router.post('/update',
  auth.isAuthenticated(),
  auth.isSuperUserActingAsCustomer(),
  controller.update)

router.get('/serveScript',
  controller.serveScript)

router.get('/mainScript',
  controller.serverMainScript)

// router.post('/checkout-create',
//   webhook.handleCheckout) // this id will be userid
//
// router.post('/cart-create',
//   webhook.handleCart) // this id will be userid
//
// router.post('/order-create',
//   webhook.handleOrder) // this id will be userid
//
// router.post('/app-uninstall',
//   webhook.handleAppUninstall) // this id will be userid
//
// router.post('/theme-publish',
//   webhook.handleThemePublish) // this id will be userid

// router.get('/clickCount',
//   webhook.clickCount) // this id will be userid
//
// router.post('/fulfillments-create',
//   webhook.fulfillmentCreate)
//
// router.post('/fulfillments-update',
//   webhook.fulfillmentUpdate)
//
// router.post('/fulfillment-events-create',
//   webhook.fulfillmentEventsCreate)
//
// router.post('/orders-cancelled',
//   webhook.ordersCancelled)
//
// router.post('/orders-fulfilled',
//   webhook.ordersFulfilled)
//
// router.post('/orders-paid',
//   webhook.ordersPaid)
//
// router.post('/orders-updated',
//   webhook.orderUpdate)

module.exports = router

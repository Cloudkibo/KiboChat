
/**
 * Created by sojharo on 27/01/2021.
 */

'use strict'

const express = require('express')

const router = express.Router()
const auth = require('../../../auth/auth.service')
const controller = require('./facebookShops.controller')
const attachBuyerInfo = require('./../../global/middleware').attachBuyerInfo

router.get('/testRoute',
  auth.isAuthenticated(),
  auth.isSuperUserActingAsCustomer(),
  controller.testRoute) // this id will be userid

router.get('/checkFacebookPermissions',
  auth.isAuthenticated(),
  auth.isSuperUserActingAsCustomer(),
  attachBuyerInfo(),
  controller.checkFacebookPermissions)

router.get('/fetchBusinessAccounts',
  auth.isAuthenticated(),
  auth.isSuperUserActingAsCustomer(),
  attachBuyerInfo(),
  controller.fetchBusinessAccounts)

router.get('/fetchCatalogs/:businessId',
  auth.isAuthenticated(),
  auth.isSuperUserActingAsCustomer(),
  attachBuyerInfo(),
  controller.fetchCatalogs)

module.exports = router

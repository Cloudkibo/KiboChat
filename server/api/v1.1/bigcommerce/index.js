/**
 * Created by sojharo on 27/07/2017.
 */

'use strict'

const express = require('express')

const router = express.Router()
const auth = require('../../../auth/auth.service')
const controller = require('./bigcommerce.controller')

router.get('/install', // handle installing of app from bigcommerce app store
  controller.install)

router.get('/load',
  controller.load)

router.post('/complete-checkout',
  controller.handleCompleteCheckout)

router.get('/uninstall',
  controller.uninstall)

router.get('/redirect',
  controller.redirect)

router.get('/fetchStore',
  auth.isAuthenticated(),
  controller.fetchStore)

router.get('/testRoute',
  auth.isAuthenticated(),
  controller.testRoute)

module.exports = router

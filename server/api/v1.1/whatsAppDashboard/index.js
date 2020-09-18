const express = require('express')
const router = express.Router()
const auth = require('../../../auth/auth.service')
const controller = require('./whatsAppDashboard.controller')

router.get('/',
  auth.isAuthenticated(),
  auth.isSuperUserActingAsCustomer(),
  controller.index)

router.post('/subscriberSummary',
  auth.isAuthenticated(),
  auth.isSuperUserActingAsCustomer(),
  controller.subscriberSummary)

router.post('/sentSeen',
  auth.isAuthenticated(),
  auth.isSuperUserActingAsCustomer(),
  controller.sentSeen)

router.post('/metrics',
  auth.isAuthenticated(),
  auth.isSuperUserActingAsCustomer(),
  controller.metrics)

module.exports = router

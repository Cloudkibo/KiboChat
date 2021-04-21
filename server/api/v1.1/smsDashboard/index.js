const express = require('express')
const router = express.Router()
const auth = require('../../../auth/auth.service')
const controller = require('./smsDashboard.controller')

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

router.get('/stats/:days',
  auth.isAuthenticated(),
  auth.isSuperUserActingAsCustomer(),
  controller.getDashboardData)

module.exports = router

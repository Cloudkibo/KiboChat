const express = require('express')
const router = express.Router()
const auth = require('../../../auth/auth.service')
const controller = require('./smsDashboard.controller')

router.get('/',
  auth.isAuthenticated(),
  controller.index)

router.post('/subscriberSummary',
  auth.isAuthenticated(),
  controller.subscriberSummary)

router.post('/sentSeen',
  auth.isAuthenticated(),
  controller.sentSeen)

module.exports = router

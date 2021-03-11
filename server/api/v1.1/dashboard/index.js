
'use strict'

const express = require('express')

const router = express.Router()

const auth = require('../../../auth/auth.service')
const controller = require('./dashboard.controller')

router.use('/sla', require('../slaDashboard'))

router.get('/sentVsSeen/:pageId',
  auth.isAuthenticated(),
  auth.isSuperUserActingAsCustomer(),
  auth.doesPlanPermitsThisAction('broadcasts'),
  auth.isUserAllowedToPerformThisAction('view_broadcasts'),
  controller.sentVsSeen)

router.post('/sentVsSeenNew',
  auth.isAuthenticated(),
  auth.isSuperUserActingAsCustomer(),
  auth.doesPlanPermitsThisAction('broadcasts'),
  auth.isUserAllowedToPerformThisAction('view_broadcasts'),
  controller.sentVsSeenNew)

router.get('/stats',
  auth.isAuthenticated(),
  auth.isSuperUserActingAsCustomer(),
  controller.stats)

router.get('/toppages',
  auth.isAuthenticated(),
  auth.isSuperUserActingAsCustomer(),
  controller.toppages)

// todo remove this, after discuss - this id will be userid, this is bad code
router.get('/:id',
  auth.isAuthenticated(),
  auth.isSuperUserActingAsCustomer(),
  controller.index)

router.get('/graphData/:days',
  auth.isAuthenticated(),
  auth.isSuperUserActingAsCustomer(),
  auth.doesPlanPermitsThisAction('broadcasts'),
  auth.isUserAllowedToPerformThisAction('view_broadcasts'),
  controller.graphData)

router.post('/subscriberSummary',
  auth.isAuthenticated(),
  auth.isSuperUserActingAsCustomer(),
  auth.doesPlanPermitsThisAction('manage_subscribers'),
  auth.isUserAllowedToPerformThisAction('view_subscribers'),
  controller.subscriberSummary)

module.exports = router

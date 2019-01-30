
'use strict'

const express = require('express')

const router = express.Router()

const auth = require('../../../auth/auth.service')
const controller = require('./dashboard.controller')

router.get('/sentVsSeen/:pageId',
  auth.isAuthenticated(),
  controller.sentVsSeen)

router.post('/sentVsSeenNew',
  auth.isAuthenticated(),
  // auth.doesPlanPermitsThisAction('dashboard'),
  // auth.doesRolePermitsThisAction('dashboardPermission'),
  controller.sentVsSeenNew)

router.get('/stats',
  auth.isAuthenticated(),
  controller.stats)

router.get('/updateSubscriptionPermission',
  auth.isAuthenticated(),
  controller.updateSubscriptionPermission)

router.get('/toppages',
  auth.isAuthenticated(),
  controller.toppages)

// todo remove this, after discuss - this id will be userid, this is bad code
router.get('/:id',
  auth.isAuthenticated(),
  controller.index)

router.get('/graphData/:days',
  auth.isAuthenticated(),
  controller.graphData)

router.post('/subscriberSummary',
  auth.isAuthenticated(),
  // auth.doesPlanPermitsThisAction('dashboard'),
  // auth.doesRolePermitsThisAction('dashboardPermission'),
  controller.subscriberSummary)

module.exports = router

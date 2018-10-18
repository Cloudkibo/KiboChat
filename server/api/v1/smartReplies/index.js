'use strict'

const express = require('express')

const router = express.Router()

const controller = require('./smartReplies.controller')
const auth = require('../../../auth/auth.service')
const validate = require('express-jsonschema').validate
const validationSchema = require('./validationSchema')

router.get('/',
  auth.isAuthenticated(),
  // auth.doesPlanPermitsThisAction('workflows'),
  // auth.doesRolePermitsThisAction('workflowPermission'),
  controller.index)

router.get('/waitingReply',
  auth.isAuthenticated(),
  // auth.doesPlanPermitsThisAction('workflows'),
  // auth.doesRolePermitsThisAction('workflowPermission'),
  controller.waitingReply)

router.post('/create',
  auth.isAuthenticated(),
  // auth.doesPlanPermitsThisAction('workflows'),
  // auth.doesRolePermitsThisAction('workflowPermission'),
  validate({body: validationSchema.createPayload}),
  controller.create)

router.post('/edit',
  auth.isAuthenticated(),
  // auth.doesPlanPermitsThisAction('workflows'),
  // auth.doesRolePermitsThisAction('workflowPermission'),
  validate({body: validationSchema.editPayload}),
  controller.edit)

router.post('/updateStatus',
  auth.isAuthenticated(),
  // auth.doesPlanPermitsThisAction('workflows'),
  // auth.doesRolePermitsThisAction('workflowPermission'),
  validate({body: validationSchema.updateStatusPayload}),
  controller.status)

router.post('/botDetails',
  auth.isAuthenticated(),
  // auth.doesPlanPermitsThisAction('workflows'),
  // auth.doesRolePermitsThisAction('workflowPermission'),
  validate({body: validationSchema.botDetailsPayload}),
  controller.details)

router.post('/fetchUnansweredQueries',
  auth.isAuthenticated(),
  // auth.doesPlanPermitsThisAction('workflows'),
  // auth.doesRolePermitsThisAction('workflowPermission'),
  validate({body: validationSchema.unAnsweredQueriesPayload}),
  controller.unAnsweredQueries)

router.post('/fetchWaitingSubscribers',
  auth.isAuthenticated(),
  // auth.doesPlanPermitsThisAction('workflows'),
  // auth.doesRolePermitsThisAction('workflowPermission'),
  validate({body: validationSchema.waitSubscribersPayload}),
  controller.waitSubscribers)

router.post('/removeWaitingSubscribers',
  auth.isAuthenticated(),
  // auth.doesPlanPermitsThisAction('workflows'),
  // auth.doesRolePermitsThisAction('workflowPermission'),
  validate({body: validationSchema.removeWaitSubscribersPayload}),
  controller.removeWaitSubscribers)

// router.post('/report', controller.report);
// router.post('/send', controller.send);

module.exports = router

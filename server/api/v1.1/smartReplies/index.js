'use strict'

const express = require('express')

const router = express.Router()

const controller = require('./smartReplies.controller')
const auth = require('../../../auth/auth.service')
const validate = require('express-jsonschema').validate
const validationSchema = require('./validationSchema')

router.get('/',
  auth.isAuthenticated(),
  auth.isSuperUserActingAsCustomer(),
  auth.doesPlanPermitsThisAction('smart_replies'),
  auth.isUserAllowedToPerformThisAction('view_bots'),
  controller.index)

router.post('/create',
  auth.isAuthenticated(),
  auth.isSuperUserActingAsCustomer('write'),
  auth.doesPlanPermitsThisAction('smart_replies'),
  auth.isUserAllowedToPerformThisAction('create_bots'),
  validate({body: validationSchema.createPayload}),
  controller.create)

router.post('/edit',
  auth.isAuthenticated(),
  auth.isSuperUserActingAsCustomer('write'),
  auth.doesPlanPermitsThisAction('smart_replies'),
  auth.isUserAllowedToPerformThisAction('update_bots'),
  validate({body: validationSchema.editPayload}),
  controller.edit)

router.post('/delete',
  auth.isAuthenticated(),
  auth.isSuperUserActingAsCustomer('write'),
  auth.doesPlanPermitsThisAction('smart_replies'),
  auth.isUserAllowedToPerformThisAction('delete_bots'),
  validate({body: validationSchema.deletePayload}),
  controller.delete)

router.post('/trainBot',
  auth.isAuthenticated(),
  auth.isSuperUserActingAsCustomer('write'),
  auth.doesPlanPermitsThisAction('smart_replies'),
  auth.isUserAllowedToPerformThisAction('train_bots'),
  validate({body: validationSchema.trainBotPayload}),
  controller.trainBot)

router.get('/waitingReply',
  auth.isAuthenticated(),
  auth.isSuperUserActingAsCustomer(),
  auth.doesPlanPermitsThisAction('smart_replies'),
  auth.isUserAllowedToPerformThisAction('view_bots'),
  controller.waitingReply)

router.post('/botDetails',
  auth.isAuthenticated(),
  auth.isSuperUserActingAsCustomer(),
  auth.doesPlanPermitsThisAction('smart_replies'),
  auth.isUserAllowedToPerformThisAction('view_bots'),
  validate({body: validationSchema.botDetailsPayload}),
  controller.details)

router.post('/fetchUnansweredQueries',
  auth.isAuthenticated(),
  auth.isSuperUserActingAsCustomer(),
  auth.doesPlanPermitsThisAction('smart_replies'),
  auth.isUserAllowedToPerformThisAction('view_bots'),
  validate({body: validationSchema.unAnsweredQueriesPayload}),
  controller.unAnsweredQueries)

router.post('/fetchWaitingSubscribers',
  auth.isAuthenticated(),
  auth.isSuperUserActingAsCustomer(),
  auth.doesPlanPermitsThisAction('smart_replies'),
  auth.isUserAllowedToPerformThisAction('view_bots'),
  validate({body: validationSchema.waitSubscribersPayload}),
  controller.waitSubscribers)

router.post('/removeWaitingSubscribers',
  auth.isAuthenticated(),
  auth.isSuperUserActingAsCustomer('write'),
  auth.doesPlanPermitsThisAction('smart_replies'),
  auth.isUserAllowedToPerformThisAction('view_bots'),
  validate({body: validationSchema.removeWaitSubscribersPayload}),
  controller.removeWaitSubscribers)

module.exports = router

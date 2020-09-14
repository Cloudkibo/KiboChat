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
  controller.index)

router.post('/create',
  auth.isAuthenticated(),
  auth.isSuperUserActingAsCustomer('write'),
  validate({body: validationSchema.createPayload}),
  controller.create)

router.post('/edit',
  auth.isAuthenticated(),
  auth.isSuperUserActingAsCustomer('write'),
  validate({body: validationSchema.editPayload}),
  controller.edit)

router.post('/delete',
  auth.isAuthenticated(),
  auth.isSuperUserActingAsCustomer('write'),
  validate({body: validationSchema.deletePayload}),
  controller.delete)

router.post('/trainBot',
  auth.isAuthenticated(),
  auth.isSuperUserActingAsCustomer('write'),
  validate({body: validationSchema.trainBotPayload}),
  controller.trainBot)

router.get('/waitingReply',
  auth.isAuthenticated(),
  auth.isSuperUserActingAsCustomer(),
  controller.waitingReply)

router.post('/botDetails',
  auth.isAuthenticated(),
  auth.isSuperUserActingAsCustomer(),
  validate({body: validationSchema.botDetailsPayload}),
  controller.details)

router.post('/fetchUnansweredQueries',
  auth.isAuthenticated(),
  auth.isSuperUserActingAsCustomer(),
  validate({body: validationSchema.unAnsweredQueriesPayload}),
  controller.unAnsweredQueries)

router.post('/fetchWaitingSubscribers',
  auth.isAuthenticated(),
  auth.isSuperUserActingAsCustomer(),
  validate({body: validationSchema.waitSubscribersPayload}),
  controller.waitSubscribers)

router.post('/removeWaitingSubscribers',
  auth.isAuthenticated(),
  auth.isSuperUserActingAsCustomer('write'),
  validate({body: validationSchema.removeWaitSubscribersPayload}),
  controller.removeWaitSubscribers)

module.exports = router

'use strict'

const express = require('express')
const router = express.Router()
const controller = require('./whatsAppSessions.controller')
const auth = require('../../../auth/auth.service')
const validate = require('express-jsonschema').validate
const validationSchema = require('./validationSchema')

router.post('/getOpenSessions',
  auth.isAuthenticated(),
  auth.isSuperUserActingAsCustomer(),
  validate({body: validationSchema.openSessionsPayload}),
  controller.fetchOpenSessions)

router.post('/getClosedSessions',
  auth.isAuthenticated(),
  auth.isSuperUserActingAsCustomer(),
  validate({body: validationSchema.openSessionsPayload}),
  controller.fetchResolvedSessions)

router.get('/markread/:id',
  auth.isAuthenticated(),
  auth.isSuperUserActingAsCustomer('write'),
  controller.markread)

router.post('/changeStatus',
  auth.isAuthenticated(),
  auth.isSuperUserActingAsCustomer('write'),
  validate({body: validationSchema.changeStatusPayload}),
  controller.changeStatus)

router.post('/updatePauseChatbot',
  auth.isAuthenticated(),
  auth.isSuperUserActingAsCustomer('write'),
  validate({body: validationSchema.updatePauseChatbotPayload}),
  controller.updatePauseChatbot)

router.post('/updatePendingResponse',
  auth.isAuthenticated(),
  auth.isSuperUserActingAsCustomer('write'),
  validate({body: validationSchema.updatePendingResponsePayload}),
  controller.updatePendingResponse)

router.post('/assignAgent',
  auth.isAuthenticated(),
  auth.isSuperUserActingAsCustomer('write'),
  validate({body: validationSchema.assignAgentPayload}),
  controller.assignAgent)

router.post('/assignTeam',
  auth.isAuthenticated(),
  auth.isSuperUserActingAsCustomer('write'),
  validate({body: validationSchema.assignTeamPayload}),
  controller.assignTeam)

module.exports = router

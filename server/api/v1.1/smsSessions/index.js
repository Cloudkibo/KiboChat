'use strict'

const express = require('express')
const router = express.Router()
const controller = require('./smsSessions.controller')
const auth = require('../../../auth/auth.service')
const validate = require('express-jsonschema').validate
const validationSchema = require('./validationSchema')

router.get('/markread/:id',
  auth.isAuthenticated(),
  controller.markread)

router.post('/updatePendingResponse',
  auth.isAuthenticated(),
  validate({body: validationSchema.updatePendingResponsePayload}),
  controller.updatePendingResponse)

router.post('/getOpenSessions',
  auth.isAuthenticated(),
  validate({body: validationSchema.openSessionsPayload}),
  controller.fetchOpenSessions)

router.post('/getClosedSessions',
  auth.isAuthenticated(),
  validate({body: validationSchema.openSessionsPayload}),
  controller.fetchResolvedSessions)

router.post('/assignAgent',
  auth.isAuthenticated(),
  validate({body: validationSchema.assignAgentPayload}),
  controller.assignAgent)

router.post('/changeStatus',
  auth.isAuthenticated(),
  validate({body: validationSchema.changeStatusPayload}),
  controller.changeStatus)

router.post('/assignTeam',
  auth.isAuthenticated(),
  validate({body: validationSchema.assignTeamPayload}),
  controller.assignTeam)

module.exports = router

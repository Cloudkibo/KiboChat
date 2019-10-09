'use strict'

const express = require('express')
const router = express.Router()
const controller = require('./whatsAppChat.controller')
const auth = require('../../../auth/auth.service')
const validate = require('express-jsonschema').validate
const validationSchema = require('./validationSchema')

router.post('/',
  auth.isAuthenticated(),
  validate({body: validationSchema.createPayload}),
  controller.create)

router.post('/getOpenSessions',
  auth.isAuthenticated(),
  validate({body: validationSchema.openSessionsPayload}),
  controller.fetchOpenSessions)

router.post('/getClosedSessions',
  auth.isAuthenticated(),
  validate({body: validationSchema.openSessionsPayload}),
  controller.fetchResolvedSessions)

router.post('/getChat/:contactId',
  auth.isAuthenticated(),
  controller.index)

router.get('/markread/:id',
  auth.isAuthenticated(),
  controller.markread)

router.post('/changeStatus',
  auth.isAuthenticated(),
  validate({body: validationSchema.changeStatusPayload}),
  controller.changeStatus)

router.post('/updatePendingResponse',
  auth.isAuthenticated(),
  validate({body: validationSchema.updatePendingResponsePayload}),
  controller.updatePendingResponse)

router.post('/search',
  auth.isAuthenticated(),
  validate({body: validationSchema.searchPayload}),
  controller.search)

router.post('/assignAgent',
  auth.isAuthenticated(),
  validate({body: validationSchema.assignAgentPayload}),
  controller.assignAgent)

router.post('/set_custom_field_value',
  auth.isAuthenticated(),
  validate({body: validationSchema.setCustomFieldValue}),
  controller.setCustomFieldValue)

module.exports = router

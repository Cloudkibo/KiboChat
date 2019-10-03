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

module.exports = router

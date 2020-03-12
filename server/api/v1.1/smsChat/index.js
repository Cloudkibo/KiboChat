'use strict'

const express = require('express')
const router = express.Router()
const controller = require('./smsChat.controller')
const auth = require('../../../auth/auth.service')
const validate = require('express-jsonschema').validate
const validationSchema = require('./validationSchema')

router.post('/',
  auth.isAuthenticated(),
  validate({body: validationSchema.createPayload}),
  controller.create)

router.post('/getSessions',
  auth.isAuthenticated(),
  validate({body: validationSchema.getPayload}),
  controller.fetchSessions)

router.post('/getChat/:contactId',
  auth.isAuthenticated(),
  controller.index)

router.get('/markread/:id',
  auth.isAuthenticated(),
  controller.markread)

router.post('/search',
  auth.isAuthenticated(),
  validate({body: validationSchema.searchPayload}),
  controller.search)

module.exports = router

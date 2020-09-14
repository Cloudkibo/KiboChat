'use strict'

const express = require('express')
const router = express.Router()
const controller = require('./notifications.controller')
const auth = require('../../../auth/auth.service')
const validate = require('express-jsonschema').validate
const validationSchema = require('./validationSchema')

router.get('/', auth.isAuthenticated(), controller.index)

router.post('/create',
  auth.isAuthenticated(),
  validate({body: validationSchema.createPayload}),
  controller.create)

router.post('/markRead',
  auth.isAuthenticated(),
  validate({body: validationSchema.markReadPayload}),
  controller.markRead)

module.exports = router

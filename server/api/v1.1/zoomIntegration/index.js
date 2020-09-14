'use strict'

const express = require('express')
const router = express.Router()
const controller = require('./zoomIntegration.controller')
const auth = require('../../../auth/auth.service')
const validate = require('express-jsonschema').validate
const validationSchema = require('./validationSchema')

router.get('/users',
  auth.isAuthenticated(),
  controller.getZoomUsers)

router.post('/meetings',
  auth.isAuthenticated(),
  validate({body: validationSchema.createMeetingPayload}),
  controller.createMeeting)

module.exports = router

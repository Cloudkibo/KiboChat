'use strict'

const express = require('express')

const router = express.Router()

const auth = require('../../../auth/auth.service')
const controller = require('./custom_field_subscriber.controller')

const validate = require('express-jsonschema').validate
const validationSchema = require('./validationSchema')

router.post('/set_custom_field_value',
  auth.isAuthenticated(),
  validate({body: validationSchema.setCustomFieldValue}),
  controller.setCustomFieldValue)

router.get('/get_custom_field_subscriber/:subscriberId',
  auth.isAuthenticated(),
  controller.getCustomFieldSubscriber
)

module.exports = router

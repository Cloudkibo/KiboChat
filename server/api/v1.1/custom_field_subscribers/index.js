'use strict'

const express = require('express')

const router = express.Router()

const auth = require('../../../auth/auth.service')
const controller = require('./custom_field_subscriber.controller')

const validate = require('express-jsonschema').validate
const validationSchema = require('./validationSchema')

router.post('/set_custom_field_value',
  auth.isAuthenticated(),
  auth.isSuperUserActingAsCustomer('write'),
  auth.doesPlanPermitsThisAction('custom_fields'),
  auth.isUserAllowedToPerformThisAction('set_custom_fields'),
  validate({body: validationSchema.setCustomFieldValue}),
  controller.setCustomFieldValue)

router.get('/get_custom_field_subscriber/:subscriberId',
  auth.isAuthenticated(),
  auth.isSuperUserActingAsCustomer(),
  auth.doesPlanPermitsThisAction('custom_fields'),
  auth.isUserAllowedToPerformThisAction('view_custom_fields'),
  controller.getCustomFieldSubscriber
)

module.exports = router

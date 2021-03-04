const express = require('express')
const router = express.Router()
const auth = require('../../../auth/auth.service')
const validate = require('express-jsonschema').validate
const validationSchema = require('./validationSchema')
const controller = require('./superNumber.controller')

router.post('/fetchTemplates',
  auth.isAuthenticated(),
  auth.isSuperUserActingAsCustomer(),
  controller.fetchTemplates)

router.post('/sendManualMessage',
  validate({body: validationSchema.sendManualMessagePayload}),
  auth.isAuthenticated(),
  auth.isSuperUserActingAsCustomer(),
  controller.sendManualMessage)

module.exports = router

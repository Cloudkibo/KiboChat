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

router.get('/',
  auth.isAuthenticated(),
  auth.isSuperUserActingAsCustomer(),
  controller.index)

router.post('/',
  auth.isAuthenticated(),
  validate({ body: validationSchema.createPayload }),
  auth.isSuperUserActingAsCustomer('write'),
  controller.create)

router.post('/update',
  auth.isAuthenticated(),
  validate({body: validationSchema.updatePayload}),
  auth.isSuperUserActingAsCustomer('write'),
  controller.update)

router.post('/delete',
  auth.isAuthenticated(),
  auth.isSuperUserActingAsCustomer('write'),
  controller.delete)

router.post('/fetchSummarisedAnalytics',
  validate({body: validationSchema.summarisedPayload}),
  auth.isAuthenticated(),
  auth.isSuperUserActingAsCustomer(),
  controller.fetchSummarisedAnalytics)

module.exports = router

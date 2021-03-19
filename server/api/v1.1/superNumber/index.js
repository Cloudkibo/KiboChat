const express = require('express')
const router = express.Router()
const auth = require('../../../auth/auth.service')
const validate = require('express-jsonschema').validate
const validationSchema = require('./validationSchema')
const controller = require('./superNumber.controller')
const codController = require('./codpages.controller')

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

router.post('/addConfirmTag',
  codController.addConfirmTag)

router.post('/addCancelledTag',
  codController.addCancelledTag)

router.post('/fetchSummarisedAnalytics',
  validate({body: validationSchema.summarisedPayload}),
  auth.isAuthenticated(),
  auth.isSuperUserActingAsCustomer(),
  controller.fetchSummarisedAnalytics)

router.post('/fetchDetailedAnalytics',
  validate({body: validationSchema.detailedPayload}),
  auth.isAuthenticated(),
  auth.isSuperUserActingAsCustomer(),
  controller.fetchDetailedAnalytics)

router.post('/fetchMessageLogs',
  validate({body: validationSchema.messageLogsPayload}),
  auth.isAuthenticated(),
  auth.isSuperUserActingAsCustomer(),
  controller.fetchMessageLogs)

router.post('/storeOptinNumberFromWidget',
  validate({body: validationSchema.storeOptinNumberFromWidget}),
  auth.isAuthenticated(),
  auth.isSuperUserActingAsCustomer('write'),
  controller.storeOptinNumberFromWidget)
module.exports = router

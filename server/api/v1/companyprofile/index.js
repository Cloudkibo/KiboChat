const express = require('express')
const router = express.Router()
const auth = require('../../../auth/auth.service')
const validate = require('express-jsonschema').validate
const validationSchema = require('./validationSchema')
const controller = require('./company.controller')
const { attachProviderInfo } = require('../../middleware/whatsApp.middleware')

router.get('/members',
  auth.isAuthenticated(),
  auth.isSuperUserActingAsCustomer(),
  controller.members)

router.get('/getAutomatedOptions',
  auth.isAuthenticated(),
  auth.isSuperUserActingAsCustomer(),
  controller.getAutomatedOptions)

router.post('/invite',
  auth.isAuthenticated(),
  auth.isSuperUserActingAsCustomer('write'),
  controller.invite)

router.post('/updateAutomatedOptions',
  auth.isAuthenticated(),
  auth.isSuperUserActingAsCustomer('write'),
  auth.hasRole('buyer'),
  controller.updateAutomatedOptions)

router.post('/updateRole',
  auth.isAuthenticated(),
  auth.isSuperUserActingAsCustomer('write'),
  controller.updateRole)

router.post('/updatePlatform',
  auth.isAuthenticated(),
  auth.isSuperUserActingAsCustomer('write'),
  validate({body: validationSchema.updatePlatformPayload}),
  controller.updatePlatform)

router.post('/updatePlatformWhatsApp',
  auth.isAuthenticated(),
  auth.isSuperUserActingAsCustomer('write'),
  validate({body: validationSchema.updatePlatformWhatsApp}),
  controller.updatePlatformWhatsApp)

router.get('/setWhatsappSuperNumberPlan',
  auth.isAuthenticated(),
  auth.isSuperUserActingAsCustomer('write'),
  controller.setWhatsappSuperNumberPlan)

router.post('/disconnect',
  auth.isAuthenticated(),
  auth.isSuperUserActingAsCustomer('write'),
  validate({body: validationSchema.disconnect}),
  controller.disconnect)

router.post('/fetchValidCallerIds',
  auth.isAuthenticated(),
  auth.isSuperUserActingAsCustomer('write'),
  validate({body: validationSchema.fetchValidCallerIds}),
  controller.fetchValidCallerIds)

router.get('/getAdvancedSettings',
  auth.isAuthenticated(),
  auth.isSuperUserActingAsCustomer(),
  controller.getAdvancedSettings)

router.post('/updateAdvancedSettings',
  auth.isAuthenticated(),
  auth.isSuperUserActingAsCustomer('write'),
  controller.updateAdvancedSettings)

router.post('/deleteWhatsAppInfo',
  auth.isAuthenticated(),
  auth.isSuperUserActingAsCustomer('write'),
  validate({body: validationSchema.deleteWhatsAppInfo}),
  controller.deleteWhatsAppInfo)

router.post('/disableMember',
  auth.isAuthenticated(),
  auth.isSuperUserActingAsCustomer('write'),
  validate({body: validationSchema.disableMember}),
  controller.disableMember)

router.post('/enableMember',
  auth.isAuthenticated(),
  auth.isSuperUserActingAsCustomer('write'),
  validate({body: validationSchema.enableMember}),
  controller.enableMember)

router.get('/getWhatsAppMessageTemplates',
  auth.isAuthenticated(),
  auth.isSuperUserActingAsCustomer(),
  attachProviderInfo(),
  controller.getWhatsAppMessageTemplates)

router.post('/setBusinessHours',
  auth.isAuthenticated(),
  auth.isSuperUserActingAsCustomer('write'),
  validate({body: validationSchema.setBusinessHoursPayload}),
  controller.setBusinessHours)

router.get('/fetchUsage',
  auth.isAuthenticated(),
  auth.isSuperUserActingAsCustomer(),
  controller.fetchUsage)

module.exports = router

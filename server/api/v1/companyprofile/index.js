const express = require('express')
const router = express.Router()
const auth = require('../../../auth/auth.service')
const validate = require('express-jsonschema').validate
const validationSchema = require('./validationSchema')
const controller = require('./company.controller')
const { attachProviderInfo } = require('../../middleware/whatsApp.middleware')

router.get('/members',
  auth.isAuthenticated(),
  auth.doesPlanPermitsThisAction('team_members_management'),
  auth.isUserAllowedToPerformThisAction('view_members'),
  controller.members)

router.get('/getAutomatedOptions',
  auth.isAuthenticated(),
  controller.getAutomatedOptions)

router.get('/switchToBasicPlan',
  auth.isAuthenticated(),
  controller.switchToBasicPlan)

router.post('/invite',
  auth.isAuthenticated(),
  auth.doesPlanPermitsThisAction('invite_members'),
  auth.isUserAllowedToPerformThisAction('invite_members'),
  controller.invite)

router.get('/getKeys',
  auth.isAuthenticated(),
  controller.getKeys)

router.post('/setCard',
  auth.isAuthenticated(),
  controller.setCard)

router.post('/updatePlan',
  auth.isAuthenticated(),
  controller.updatePlan)

router.post('/updateAutomatedOptions',
  auth.isAuthenticated(),
  auth.hasRole('buyer'),
  controller.updateAutomatedOptions)

router.post('/updateRole',
  auth.isAuthenticated(),
  auth.doesPlanPermitsThisAction('team_members_management'),
  auth.isUserAllowedToPerformThisAction('update_role'),
  controller.updateRole)

router.post('/updatePlatform',
  auth.isAuthenticated(),
  validate({body: validationSchema.updatePlatformPayload}),
  controller.updatePlatform)

router.post('/updatePlatformWhatsApp',
  auth.isAuthenticated(),
  validate({body: validationSchema.updatePlatformWhatsApp}),
  controller.updatePlatformWhatsApp)

router.post('/disconnect',
  auth.isAuthenticated(),
  validate({body: validationSchema.disconnect}),
  controller.disconnect)

router.post('/fetchValidCallerIds',
  auth.isAuthenticated(),
  validate({body: validationSchema.fetchValidCallerIds}),
  controller.fetchValidCallerIds)

router.get('/getAdvancedSettings',
  auth.isAuthenticated(),
  auth.doesPlanPermitsThisAction('advanced_settings'),
  auth.isUserAllowedToPerformThisAction('manage_advanced_settings'),
  controller.getAdvancedSettings)

router.post('/updateAdvancedSettings',
  auth.isAuthenticated(),
  auth.doesPlanPermitsThisAction('advanced_settings'),
  auth.isUserAllowedToPerformThisAction('manage_advanced_settings'),
  controller.updateAdvancedSettings)

router.post('/deleteWhatsAppInfo',
  auth.isAuthenticated(),
  validate({body: validationSchema.deleteWhatsAppInfo}),
  controller.deleteWhatsAppInfo)

router.get('/getAdvancedSettings',
  auth.isAuthenticated(),
  auth.doesPlanPermitsThisAction('advanced_settings'),
  auth.isUserAllowedToPerformThisAction('manage_advanced_settings'),
  controller.getAdvancedSettings)

router.post('/updateAdvancedSettings',
  auth.isAuthenticated(),
  auth.doesPlanPermitsThisAction('advanced_settings'),
  auth.isUserAllowedToPerformThisAction('manage_advanced_settings'),
  validate({body: validationSchema.advancedSettingsPayload}),
  controller.updateAdvancedSettings)
  
router.post('/disableMember',
  auth.isAuthenticated(),
  validate({body: validationSchema.disableMember}),
  controller.disableMember)

router.post('/enableMember',
  auth.isAuthenticated(),
  validate({body: validationSchema.enableMember}),
  controller.enableMember)

router.post('/disableMember',
  auth.isAuthenticated(),
  validate({body: validationSchema.disableMember}),
  controller.disableMember)

router.post('/enableMember',
  auth.isAuthenticated(),
  validate({body: validationSchema.enableMember}),
  controller.enableMember)

router.get('/getWhatsAppMessageTemplates',
  auth.isAuthenticated(),
  attachProviderInfo(),
  controller.getWhatsAppMessageTemplates)

module.exports = router

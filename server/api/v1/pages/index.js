const express = require('express')
const router = express.Router()
const auth = require('../../../auth/auth.service')
const validate = require('express-jsonschema').validate

const validationSchema = require('./validationSchema')
const controller = require('./pages.controller')

router.get('/',
  auth.isAuthenticated(),
  auth.isSuperUserActingAsCustomer(),
  auth.doesPlanPermitsThisAction('manage_pages'),
  auth.isUserAllowedToPerformThisAction('manage_facebook_pages'),
  controller.index)

router.post('/allConnectedPages',
  auth.isAuthenticated(),
  auth.isSuperUserActingAsCustomer(),
  auth.doesPlanPermitsThisAction('manage_pages'),
  auth.isUserAllowedToPerformThisAction('manage_facebook_pages'),
  controller.connectedPages)

router.get('/allpages',
  auth.isAuthenticated(),
  auth.isSuperUserActingAsCustomer(),
  auth.doesPlanPermitsThisAction('manage_pages'),
  auth.isUserAllowedToPerformThisAction('manage_facebook_pages'),
  controller.allPages)

router.get('/addpages',
  auth.isAuthenticated(),
  auth.isSuperUserActingAsCustomer(),
  auth.doesPlanPermitsThisAction('manage_pages'),
  auth.isUserAllowedToPerformThisAction('manage_facebook_pages'),
  controller.addPages)

router.get('/otherPages',
  auth.isAuthenticated(),
  auth.isSuperUserActingAsCustomer(),
  auth.doesPlanPermitsThisAction('manage_pages'),
  auth.isUserAllowedToPerformThisAction('manage_facebook_pages'),
  controller.otherPages)

router.post('/enable',
  auth.isAuthenticated(),
  auth.isSuperUserActingAsCustomer('write'),
  auth.doesPlanPermitsThisAction('manage_pages'),
  auth.isUserAllowedToPerformThisAction('manage_facebook_pages'),
  controller.enable)

router.post('/disable',
  auth.isAuthenticated(),
  auth.isSuperUserActingAsCustomer('write'),
  auth.doesPlanPermitsThisAction('manage_pages'),
  auth.isUserAllowedToPerformThisAction('manage_facebook_pages'),
  controller.disable)

router.post('/createWelcomeMessage',
  auth.isAuthenticated(),
  auth.isSuperUserActingAsCustomer('write'),
  auth.doesPlanPermitsThisAction('welcome_message'),
  auth.isUserAllowedToPerformThisAction('manage_welcome_message'),
  validate({body: validationSchema.welcomeMessagePayload}),
  controller.createWelcomeMessage)

router.post('/isWelcomeMessageEnabled',
  auth.isAuthenticated(),
  auth.isSuperUserActingAsCustomer('write'),
  auth.doesPlanPermitsThisAction('welcome_message'),
  auth.isUserAllowedToPerformThisAction('manage_welcome_message'),
  validate({body: validationSchema.enableDisableWelcomeMessagePayload}),
  controller.enableDisableWelcomeMessage)

router.post('/saveGreetingText',
  auth.isAuthenticated(),
  auth.isSuperUserActingAsCustomer('write'),
  auth.doesPlanPermitsThisAction('greeting_text'),
  auth.isUserAllowedToPerformThisAction('manage_greeting_text'),
  controller.saveGreetingText)

router.post('/whitelistDomain',
  auth.isAuthenticated(),
  auth.isSuperUserActingAsCustomer('write'),
  auth.doesPlanPermitsThisAction('manage_pages'),
  auth.isUserAllowedToPerformThisAction('manage_facebook_pages'),
  controller.whitelistDomain)

router.get('/fetchWhitelistedDomains/:_id',
  auth.isAuthenticated(),
  auth.isSuperUserActingAsCustomer(),
  auth.doesPlanPermitsThisAction('manage_pages'),
  auth.isUserAllowedToPerformThisAction('manage_facebook_pages'),
  controller.fetchWhitelistedDomains)

router.post('/deleteWhitelistDomain',
  auth.isAuthenticated(),
  auth.isSuperUserActingAsCustomer('write'),
  auth.doesPlanPermitsThisAction('manage_pages'),
  auth.isUserAllowedToPerformThisAction('manage_facebook_pages'),
  controller.deleteWhitelistDomain)

router.post('/isWhitelisted',
  auth.isAuthenticated(),
  auth.isSuperUserActingAsCustomer(),
  auth.doesPlanPermitsThisAction('manage_pages'),
  auth.isUserAllowedToPerformThisAction('manage_facebook_pages'),
  controller.isWhitelisted)

router.post('/refreshPages',
  auth.isAuthenticated(),
  auth.isSuperUserActingAsCustomer('write'),
  controller.refreshPages)

module.exports = router

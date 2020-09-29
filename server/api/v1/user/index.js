const express = require('express')
const router = express.Router()
const auth = require('../../../auth/auth.service')
const validate = require('express-jsonschema').validate

const validationSchema = require('./validationSchema')
const controller = require('./user.controller')

router.get('/',
  auth.isAuthenticated(),
  auth.isSuperUserActingAsCustomer(),
  controller.index)

router.post('/updateChecks',
  auth.isAuthenticated(),
  auth.isSuperUserActingAsCustomer('write'),
  validate({body: validationSchema.updateChecksPayload}),
  controller.updateChecks)

router.get('/updateSkipConnect',
  auth.isAuthenticated(),
  auth.isSuperUserActingAsCustomer('write'),
  controller.updateSkipConnect)

router.post('/updateMode',
  auth.isAuthenticated(),
  auth.isSuperUserActingAsCustomer('write'),
  validate({body: validationSchema.updateMode}),
  controller.updateMode)

router.get('/fbAppId',
  auth.isAuthenticated(),
  auth.isSuperUserActingAsCustomer(),
  controller.fbAppId)

router.post('/authenticatePassword',
  auth.isAuthenticated(),
  auth.isSuperUserActingAsCustomer('write'),
  validate({body: validationSchema.authenticatePassword}),
  controller.authenticatePassword)

router.get('/addAccountType',
  controller.addAccountType)

router.post('/enableDelete',
  auth.isAuthenticated(),
  auth.isSuperUserActingAsCustomer('write'),
  auth.doesPlanPermitsThisAction('delete_account_information'),
  auth.isUserAllowedToPerformThisAction('delete_account_information'),
  validate({body: validationSchema.enableGDPRDelete}),
  controller.enableDelete)

router.get('/cancelDeletion',
  auth.isAuthenticated(),
  auth.isSuperUserActingAsCustomer('write'),
  auth.doesPlanPermitsThisAction('delete_account_information'),
  auth.isUserAllowedToPerformThisAction('delete_account_information'),
  controller.cancelDeletion)

router.post('/updateShowIntegrations',
  auth.isAuthenticated(),
  auth.isSuperUserActingAsCustomer('write'),
  controller.updateShowIntegrations)

router.get('/disconnectFacebook',
  auth.isAuthenticated(),
  auth.isSuperUserActingAsCustomer('write'),
  auth.isUserAllowedToPerformThisAction('connect_facebook_account'),
  controller.disconnectFacebook)

router.get('/validateUserAccessToken',
  auth.isAuthenticated(),
  auth.isSuperUserActingAsCustomer(),
  controller.validateUserAccessToken)

router.get('/validateFacebookConnected',
  auth.isAuthenticated(),
  auth.isSuperUserActingAsCustomer(),
  controller.validateFacebookConnected)

router.get('/logout',
  auth.isAuthenticated(),
  controller.logout)

router.get('/receivelogout',
  auth.isAuthenticated(),
  controller.receivelogout)

router.post('/updatePlatform',
  auth.isAuthenticated(),
  auth.isSuperUserActingAsCustomer(),
  validate({body: validationSchema.platformPayload}),
  controller.updatePlatform)

router.get('/logout',
  auth.isAuthenticated(),
  controller.logout)

router.get('/receivelogout',
  auth.isAuthenticated(),
  controller.receivelogout)

module.exports = router

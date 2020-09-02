const express = require('express')
const router = express.Router()
const auth = require('../../../auth/auth.service')
const validate = require('express-jsonschema').validate

const validationSchema = require('./validationSchema')
const controller = require('./user.controller')

router.get('/',
  auth.isAuthenticated(),
  controller.index)

router.post('/updateChecks',
  auth.isAuthenticated(),
  validate({body: validationSchema.updateChecksPayload}),
  controller.updateChecks)

router.get('/updateSkipConnect',
  auth.isAuthenticated(),
  controller.updateSkipConnect)

router.post('/updateMode',
  auth.isAuthenticated(),
  validate({body: validationSchema.updateMode}),
  controller.updateMode)

router.get('/fbAppId',
  auth.isAuthenticated(),
  controller.fbAppId)

router.post('/authenticatePassword',
  auth.isAuthenticated(),
  validate({body: validationSchema.authenticatePassword}),
  controller.authenticatePassword)

router.get('/addAccountType',
  controller.addAccountType)

router.post('/enableDelete',
  auth.isAuthenticated(),
  validate({body: validationSchema.enableGDPRDelete}),
  controller.enableDelete)

router.get('/cancelDeletion',
  auth.isAuthenticated(),
  controller.cancelDeletion)

router.post('/updateShowIntegrations',
  auth.isAuthenticated(),
  controller.updateShowIntegrations)

router.get('/disconnectFacebook',
  auth.isAuthenticated(),
  controller.disconnectFacebook)

router.get('/validateUserAccessToken',
  auth.isAuthenticated(),
  controller.validateUserAccessToken)

router.get('/validateFacebookConnected',
  auth.isAuthenticated(),
  controller.validateFacebookConnected)

router.get('/logout',
  auth.isAuthenticated(),
  controller.logout)

router.get('/receivelogout',
  auth.isAuthenticated(),
  controller.receivelogout)

router.post('/updatePlatform',
  auth.isAuthenticated(),
  validate({body: validationSchema.platformPayload}),
  controller.updatePlatform)

module.exports = router

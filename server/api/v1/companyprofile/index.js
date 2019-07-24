const express = require('express')
const router = express.Router()
const auth = require('../../../auth/auth.service')
const validate = require('express-jsonschema').validate
const validationSchema = require('./validationSchema')
const controller = require('./company.controller')

router.get('/members',
  auth.isAuthenticated(),
  controller.members)

router.get('/getAutomatedOptions',
  auth.isAuthenticated(),
  controller.getAutomatedOptions)

router.post('/invite', auth.isAuthenticated(), controller.invite)

router.post('/updateAutomatedOptions',
  auth.isAuthenticated(),
  auth.hasRole('buyer'),
  controller.updateAutomatedOptions)

  router.post('/updateRole',
  auth.isAuthenticated(),
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

module.exports = router

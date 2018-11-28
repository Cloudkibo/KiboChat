const express = require('express')
const router = express.Router()
const auth = require('../../../auth/auth.service')
const validationSchema = require('./validationSchema')
const validate = require('express-jsonschema').validate
const controller = require('./api_settings.controller')

router.post('/',
  auth.isAuthenticated(),
  validate({body: validationSchema.apiPayload}),
  // auth.doesPlanPermitsThisAction('api'),
  // auth.doesRolePermitsThisAction('apiPermission'),
  controller.index)

router.post('/enable',
  auth.isAuthenticated(),
  validate({body: validationSchema.enablePayload}),
  // auth.doesPlanPermitsThisAction('api'),
  // auth.doesRolePermitsThisAction('apiPermission'),
  controller.enable)

router.post('/disable',
  auth.isAuthenticated(),
  validate({body: validationSchema.disablePayload}),
  // auth.doesPlanPermitsThisAction('api'),
  // auth.doesRolePermitsThisAction('apiPermission'),
  controller.disable)

router.post('/reset',
  auth.isAuthenticated(),
  validate({body: validationSchema.apiPayload}),
  // auth.doesPlanPermitsThisAction('api'),
  // auth.doesRolePermitsThisAction('apiPermission'),
  controller.reset)

module.exports = router

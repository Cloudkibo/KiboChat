
'use strict'

const express = require('express')
const router = express.Router()
const controller = require('./menu.controller')
const auth = require('../../../auth/auth.service')

const validate = require('express-jsonschema').validate
const validationSchema = require('./validationSchema')

router.get('/',
  auth.isAuthenticated(),
  auth.isSuperUserActingAsCustomer(),
  auth.doesPlanPermitsThisAction('menu'),
  auth.isUserAllowedToPerformThisAction('set_persistent_menu'),
  controller.index)

router.post('/indexByPage',
  auth.isAuthenticated(),
  auth.isSuperUserActingAsCustomer(),
  auth.doesPlanPermitsThisAction('menu'),
  auth.isUserAllowedToPerformThisAction('set_persistent_menu'),
  controller.indexByPage)

router.post('/create',
  auth.isAuthenticated(),
  auth.isSuperUserActingAsCustomer('write'),
  auth.doesPlanPermitsThisAction('menu'),
  auth.isUserAllowedToPerformThisAction('set_persistent_menu'),
  controller.create)

router.post('/addWebview',
  auth.isAuthenticated(),
  auth.isSuperUserActingAsCustomer('write'),
  auth.doesPlanPermitsThisAction('menu'),
  auth.isUserAllowedToPerformThisAction('set_persistent_menu'),
  validate({body: validationSchema.webviewPayload}),
  controller.addWebview)

module.exports = router

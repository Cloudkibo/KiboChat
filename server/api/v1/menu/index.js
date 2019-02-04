
'use strict'

const express = require('express')
const router = express.Router()
const controller = require('./menu.controller')
const auth = require('../../../auth/auth.service')

const validate = require('express-jsonschema').validate
const validationSchema = require('./validationSchema')

router.get('/',
  auth.isAuthenticated(),
  auth.doesPlanPermitsThisAction('menu'),
  auth.doesRolePermitsThisAction('menuPermission'),
  controller.index)

router.post('/indexByPage',
  auth.isAuthenticated(),
  auth.doesPlanPermitsThisAction('menu'),
  auth.doesRolePermitsThisAction('menuPermission'),
  controller.indexByPage)

router.post('/create',
  auth.isAuthenticated(),
  auth.doesPlanPermitsThisAction('menu'),
  auth.doesRolePermitsThisAction('menuPermission'),
  controller.create)

router.post('/addWebview',
  auth.isAuthenticated(),
  auth.doesPlanPermitsThisAction('menu'),
  auth.doesRolePermitsThisAction('menuPermission'),
  validate({body: validationSchema.webviewPayload}),
  controller.addWebview)

module.exports = router

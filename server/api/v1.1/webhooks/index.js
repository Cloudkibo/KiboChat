/**
 * Created by sojharo on 20/07/2017.
 */

'use strict'

const express = require('express')

const router = express.Router()

const auth = require('../../../auth/auth.service')
const controller = require('./webhooks.controller')
const validate = require('express-jsonschema').validate
const validationSchema = require('./validationSchema')

router.get('/',
  auth.isAuthenticated(),
  auth.isSuperUserActingAsCustomer(),
  auth.doesPlanPermitsThisAction('webhook'),
  auth.isUserAllowedToPerformThisAction('manage_webhooks'),
  controller.index)

router.post('/create',
  auth.isAuthenticated(),
  auth.isSuperUserActingAsCustomer('write'),
  auth.doesPlanPermitsThisAction('webhook'),
  auth.isUserAllowedToPerformThisAction('manage_webhooks'),
  validate({body: validationSchema.createPayload}),
  controller.create)

router.post('/edit',
  auth.isAuthenticated(),
  auth.isSuperUserActingAsCustomer('write'),
  auth.doesPlanPermitsThisAction('webhook'),
  auth.isUserAllowedToPerformThisAction('manage_webhooks'),
  validate({body: validationSchema.editPayload}),
  controller.edit)

router.post('/enabled',
  auth.isAuthenticated(),
  auth.isSuperUserActingAsCustomer('write'),
  auth.doesPlanPermitsThisAction('webhook'),
  auth.isUserAllowedToPerformThisAction('manage_webhooks'),
  validate({body: validationSchema.enablePayload}),
  controller.enabled)

router.post('/sendWebhook',
  auth.isItWebhookServer(),
  validate({body: validationSchema.sendWebhookPayload}),
  controller.sendWebhook)

module.exports = router

'use strict'

const express = require('express')
const router = express.Router()
const controller = require('./messageAlerts.controller')
const auth = require('../../../auth/auth.service')
const validate = require('express-jsonschema').validate
const validationSchema = require('./validationSchema')

router.post('/',
  auth.isAuthenticated(),
  auth.isSuperUserActingAsCustomer(),
  auth.doesPlanPermitsThisAction('message_alerts'),
  auth.doesRolePermitsThisAction('configure_message_alerts'),
  validate({body: validationSchema.fetchMessageAlertsPayload}),
  controller.index)

router.post('/subscriptions',
  auth.isAuthenticated(),
  auth.isSuperUserActingAsCustomer(),
  auth.doesPlanPermitsThisAction('message_alerts'),
  auth.doesRolePermitsThisAction('configure_message_alerts'),
  validate({body: validationSchema.fetchMessageAlertsPayload}),
  controller.fetchSubscriptions)

router.post('/saveAlert',
  auth.isAuthenticated(),
  auth.isSuperUserActingAsCustomer('write'),
  auth.doesPlanPermitsThisAction('message_alerts'),
  auth.doesRolePermitsThisAction('configure_message_alerts'),
  validate({body: validationSchema.saveAlertPayload}),
  controller.saveAlert)

module.exports = router

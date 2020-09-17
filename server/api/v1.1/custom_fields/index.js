'use strict'

const express = require('express')

const router = express.Router()

const auth = require('../../../auth/auth.service')
const controller = require('./custom_field.controller')

const validate = require('express-jsonschema').validate
const validationSchema = require('./validationSchema')

router.get('/',
  auth.isAuthenticated(),
  auth.isSuperUserActingAsCustomer(),
  auth.doesPlanPermitsThisAction('custom_fields'),
  auth.isUserAllowedToPerformThisAction('view_custom_fields'),
  controller.index)

router.post('/',
  auth.isAuthenticated(),
  auth.isSuperUserActingAsCustomer('write'),
  auth.doesPlanPermitsThisAction('custom_fields'),
  auth.isUserAllowedToPerformThisAction('create_custom_fields'),
  validate({ body: validationSchema.createPayload }),
  controller.create)

router.post('/update',
  auth.isAuthenticated(),
  auth.isSuperUserActingAsCustomer('write'),
  auth.doesPlanPermitsThisAction('custom_fields'),
  auth.isUserAllowedToPerformThisAction('update_custom_fields'),
  validate({body: validationSchema.updatePayload}),
  controller.update)

router.post('/delete',
  auth.isAuthenticated(),
  auth.isSuperUserActingAsCustomer('write'),
  auth.doesPlanPermitsThisAction('custom_fields'),
  auth.isUserAllowedToPerformThisAction('delete_custom_fields'),
  validate({body: validationSchema.deletePayload}),
  controller.delete)

module.exports = router

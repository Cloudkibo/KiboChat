'use strict'

const express = require('express')

const router = express.Router()

const auth = require('../../../auth/auth.service')
const controller = require('./adminAlerts.controller')

const validate = require('express-jsonschema').validate
const validationSchema = require('./validationSchema')

router.get('/',
  auth.isAuthenticated(),
  auth.isSuperUserActingAsCustomer(),
  controller.index)

router.post('/update',
  auth.isAuthenticated(),
  validate({body: validationSchema.updatePayload}),
  auth.isSuperUserActingAsCustomer('write'),
  controller.update)

module.exports = router

'use strict'

const express = require('express')

const router = express.Router()

const auth = require('../../../auth/auth.service')
const controller = require('./intents.controller')

const validate = require('express-jsonschema').validate
const validationSchema = require('./validationSchema')

router.post('/query',
  auth.isAuthenticated(),
  auth.isSuperUserActingAsCustomer(),
  validate({ body: validationSchema.getIntentPayload }),
  controller.index)

router.post('/',
  auth.isAuthenticated(),
  auth.isSuperUserActingAsCustomer('write'),
  validate({ body: validationSchema.createPayload }),
  controller.create)

router.post('/update',
  auth.isAuthenticated(),
  auth.isSuperUserActingAsCustomer('write'),
  validate({body: validationSchema.updatePayload}),
  controller.update)

router.post('/delete',
  auth.isAuthenticated(),
  auth.isSuperUserActingAsCustomer('write'),
  validate({body: validationSchema.deletePayload}),
  controller.delete)

module.exports = router

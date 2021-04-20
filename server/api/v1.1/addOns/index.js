'use strict'

const express = require('express')

const router = express.Router()

const auth = require('../../../auth/auth.service')
const controller = require('./controller')

const validate = require('express-jsonschema').validate
const validationSchema = require('./validationSchema')

router.post('/',
  auth.isAuthenticated(),
  auth.isSuperUserActingAsCustomer('write'),
  validate({ body: validationSchema.createPayload }),
  controller.create)

router.get('/',
  auth.isAuthenticated(),
  auth.isSuperUserActingAsCustomer(),
  controller.index)

router.get('/:id/purchase',
  auth.isAuthenticated(),
  auth.isSuperUserActingAsCustomer('write'),
  controller.purchaseAddOn)

router.get('/company',
  auth.isAuthenticated(),
  auth.isSuperUserActingAsCustomer(),
  controller.companyAddOns)

module.exports = router

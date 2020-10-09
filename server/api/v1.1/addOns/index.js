'use strict'

const express = require('express')

const router = express.Router()

const auth = require('../../../auth/auth.service')
const controller = require('./controller')

const validate = require('express-jsonschema').validate
const validationSchema = require('./validationSchema')

router.post('/',
  auth.isAuthenticated(),
  auth.isAuthorizedSuperUser(),
  validate({ body: validationSchema.createPayload }),
  controller.create)

router.get('/',
  auth.isAuthenticated(),
  controller.index)

router.get('/:id/purchase',
  auth.isAuthenticated(),
  controller.purchaseAddOn)

router.get('/company',
  auth.isAuthenticated(),
  controller.companyAddOns)

module.exports = router

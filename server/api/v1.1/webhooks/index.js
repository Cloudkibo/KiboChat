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

router.get('/', auth.isAuthenticated(), controller.index)

router.post('/create',
  auth.isAuthenticated(),
  validate({body: validationSchema.createPayload}),
  controller.create)

router.post('/edit',
  auth.isAuthenticated(),
  validate({body: validationSchema.editPayload}),
  controller.edit)

router.post('/enabled',
  auth.isAuthenticated(),
  validate({body: validationSchema.enablePayload}),
  controller.enabled)

module.exports = router

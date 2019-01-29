'use strict'

const express = require('express')

const router = express.Router()

const auth = require('../../../auth/auth.service')
const controller = require('./custom_field.controller')

const validate = require('express-jsonschema').validate
const validationSchema = require('./validationSchema')

router.get('/',
  auth.isAuthenticated(),
  controller.index)

router.post('/',
  auth.isAuthenticated(),
  validate({ body: validationSchema.createPayload }),
  controller.create)

router.post('/delete',
  auth.isAuthenticated(),
  validate({body: validationSchema.deletePayload}),
  controller.delete)

'use strict'

const express = require('express')

const router = express.Router()

const auth = require('../../../auth/auth.service')
const controller = require('./cannedResponses.controller')

const validate = require('express-jsonschema').validate
const validationSchema = require('./validationSchema')

router.get('/',
  auth.isAuthenticated(),
  controller.index)

router.post('/',
  auth.isAuthenticated(),
  validate({ body: validationSchema.createPayload }),
  controller.create)

router.post('/edit',
  auth.isAuthenticated(),
  validate({body: validationSchema.updatePayload}),
  controller.edit)

router.post('/delete',
  auth.isAuthenticated(),
  validate({body: validationSchema.deletePayload}),
  controller.delete)

module.exports = router

'use strict'

const express = require('express')

const router = express.Router()

const controller = require('./backdoor.controller')
const auth = require('../../../auth/auth.service')
const validationSchema = require('./validationSchema')
const validate = require('express-jsonschema').validate

router.post('/actingAsUser',
  validate({body: validationSchema.actingAsUserPayload}),
  auth.isAuthorizedSuperUser(),
  controller.actingAsUser)

module.exports = router

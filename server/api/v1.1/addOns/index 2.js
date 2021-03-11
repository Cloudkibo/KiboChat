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

module.exports = router

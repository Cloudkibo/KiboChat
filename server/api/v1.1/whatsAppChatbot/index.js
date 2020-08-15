'use strict'

const express = require('express')
const router = express.Router()
const controller = require('./whatsAppChatbot.controller')
const auth = require('../../../auth/auth.service')
const validate = require('express-jsonschema').validate
const validationSchema = require('./validationSchema')

router.post('/',
  auth.isAuthenticated(),
  validate({ body: validationSchema.createPayload }),
  controller.create)

router.get('/',
  auth.isAuthenticated(),
  controller.fetch)

module.exports = router

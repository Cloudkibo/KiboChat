'use strict'

const express = require('express')
const router = express.Router()
const controller = require('./whatsAppChat.controller')
const auth = require('../../../auth/auth.service')
const validate = require('express-jsonschema').validate
const validationSchema = require('./validationSchema')
const { attachProviderInfo } = require('../../middleware/whatsApp.middleware')

router.post('/',
  auth.isAuthenticated(),
  auth.isSuperUserActingAsCustomer('write'),
  attachProviderInfo(),
  validate({body: validationSchema.createPayload}),
  controller.create)

router.post('/getChat/:contactId',
  auth.isAuthenticated(),
  auth.isSuperUserActingAsCustomer(),
  controller.index)

router.post('/search',
  auth.isAuthenticated(),
  auth.isSuperUserActingAsCustomer(),
  validate({body: validationSchema.searchPayload}),
  controller.search)

router.post('/set_custom_field_value',
  auth.isAuthenticated(),
  auth.isSuperUserActingAsCustomer('write'),
  validate({body: validationSchema.setCustomFieldValue}),
  controller.setCustomFieldValue)

module.exports = router

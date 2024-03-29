'use strict'

const express = require('express')
const router = express.Router()
const smsController = require('./sms.controller')
const whatsAppController = require('./whatsApp.controller')
const validate = require('express-jsonschema').validate
const validationSchema = require('./validationSchema')

// SMS
router.post('/',
  validate({body: validationSchema.payload}),
  smsController.index)

// WhatsApp
router.post('/whatsAppMessage',
  validate({body: validationSchema.payloadForWhatsApp}),
  whatsAppController.index)
router.post('/trackStatusWhatsAppChat/:id', whatsAppController.trackStatusWhatsAppChat)

module.exports = router

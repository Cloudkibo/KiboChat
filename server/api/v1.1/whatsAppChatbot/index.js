'use strict'

const express = require('express')
const router = express.Router()
const controller = require('./whatsAppChatbot.controller')
const auth = require('../../../auth/auth.service')
// const validate = require('express-jsonschema').validate
// const validationSchema = require('./validationSchema')

router.post('/',
  auth.isAuthenticated(),
  controller.create)

router.get('/',
  auth.isAuthenticated(),
  controller.fetch)

router.get('/chatbotDetails',
  auth.isAuthenticated(),
  controller.getChatbotDetails)

router.put('/',
  auth.isAuthenticated(),
  controller.update)

module.exports = router

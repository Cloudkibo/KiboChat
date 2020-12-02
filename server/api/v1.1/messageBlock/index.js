const express = require('express')
const router = express.Router()
const auth = require('../../../auth/auth.service')
const validate = require('express-jsonschema').validate

const controller = require('./messageBlock.controller')
const validationSchema = require('./validationSchema')

router.post('/',
  auth.isAuthenticated(),
  auth.isSuperUserActingAsCustomer('write'),
  auth.doesPlanPermitsThisAction('chatbot_automation'),
  auth.isUserAllowedToPerformThisAction('configure_chatbot_automation'),
  validate({ body: validationSchema.createPayload }),
  controller.create)

router.delete('/',
  auth.isAuthenticated(),
  auth.isSuperUserActingAsCustomer('write'),
  auth.doesPlanPermitsThisAction('chatbot_automation'),
  auth.isUserAllowedToPerformThisAction('configure_chatbot_automation'),
  controller.delete)

router.post('/attachment',
  auth.isAuthenticated(),
  auth.isSuperUserActingAsCustomer('write'),
  auth.doesPlanPermitsThisAction('chatbot_automation'),
  auth.isUserAllowedToPerformThisAction('configure_chatbot_automation'),
  controller.attachment)

router.get('/scriptChatbotBlocks',
  controller.scriptChatbotBlocks)

module.exports = router

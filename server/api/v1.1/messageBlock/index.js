const express = require('express')
const router = express.Router()
const auth = require('../../../auth/auth.service')
const validate = require('express-jsonschema').validate

const controller = require('./messageBlock.controller')
const validationSchema = require('./validationSchema')

router.post('/',
  auth.isAuthenticated(),
  auth.isSuperUserActingAsCustomer('write'),
  validate({ body: validationSchema.createPayload }),
  controller.create)

router.delete('/',
  auth.isAuthenticated(),
  auth.isSuperUserActingAsCustomer('write'),
  controller.delete)

router.post('/attachment',
  auth.isAuthenticated(),
  auth.isSuperUserActingAsCustomer('write'),
  controller.attachment)

router.get('/scriptChatbotBlocks',
  controller.scriptChatbotBlocks)

module.exports = router

const express = require('express')
const router = express.Router()
const auth = require('../../../auth/auth.service')
const validate = require('express-jsonschema').validate

const controller = require('./controller')
const validationSchema = require('./validationSchema')

router.post('/',
  auth.isAuthenticated(),
  auth.isSuperUserActingAsCustomer('write'),
  validate({ body: validationSchema.createChatbotPayload }),
  controller.create)

router.get('/',
  auth.isAuthenticated(),
  auth.isSuperUserActingAsCustomer(),
  controller.index)

router.get('/:id/details',
  auth.isAuthenticated(),
  auth.isSuperUserActingAsCustomer(),
  controller.details)

router.put('/',
  auth.isAuthenticated(),
  auth.isSuperUserActingAsCustomer('write'),
  validate({ body: validationSchema.updateChatbotPayload }),
  controller.update)

router.put('/:id',
  auth.isAuthenticated(),
  auth.isSuperUserActingAsCustomer('write'),
  validate({ body: validationSchema.updateEcommerceChatbotPayload }),
  controller.updateEcommerceChatbot)

router.post('/block',
  auth.isAuthenticated(),
  auth.isSuperUserActingAsCustomer('write'),
  validate({ body: validationSchema.createChatbotBlockPayload }),
  controller.handleBlock)

router.delete('/block',
  auth.isAuthenticated(),
  auth.isSuperUserActingAsCustomer('write'),
  validate({ body: validationSchema.deleteChatbotBlockPayload }),
  controller.deleteBlock)

module.exports = router

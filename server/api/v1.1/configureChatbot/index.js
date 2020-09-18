const express = require('express')
const router = express.Router()
const auth = require('../../../auth/auth.service')
const validate = require('express-jsonschema').validate

const controller = require('./controller')
const validationSchema = require('./validationSchema')

router.post('/',
  auth.isAuthenticated(),
  validate({ body: validationSchema.createChatbotPayload }),
  controller.create)

router.get('/',
  auth.isAuthenticated(),
  controller.index)

router.get('/:id/details',
  auth.isAuthenticated(),
  controller.details)

router.put('/',
  auth.isAuthenticated(),
  validate({ body: validationSchema.updateChatbotPayload }),
  controller.update)

router.post('/block',
  auth.isAuthenticated(),
  validate({ body: validationSchema.createChatbotBlockPayload }),
  controller.handleBlock)

module.exports = router

const express = require('express')
const router = express.Router()
const auth = require('../../../auth/auth.service')
const validate = require('express-jsonschema').validate
const validationSchema = require('./validationSchema')
const controller = require('./whatsAppContacts.controller')
const multiparty = require('connect-multiparty')
const multipartyMiddleware = multiparty()
const { attachProviderInfo } = require('../../middleware/whatsApp.middleware')

router.post('/',
  auth.isAuthenticated(),
  validate({body: validationSchema.payload}),
  controller.index)

router.post('/create',
  auth.isAuthenticated(),
  validate({body: validationSchema.createPayload}),
  controller.create)

router.post('/update/:id',
  auth.isAuthenticated(),
  controller.update)

router.get('/unSubscribe/:id',
  auth.isAuthenticated(),
  controller.unSubscribe)

router.post('/getDuplicateSubscribers',
  auth.isAuthenticated(),
  multipartyMiddleware,
  controller.getDuplicateSubscribers)

router.post('/sendMessage',
  auth.isAuthenticated(),
  attachProviderInfo(),
  multipartyMiddleware,
  controller.sendMessage)

module.exports = router

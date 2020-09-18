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
  auth.isSuperUserActingAsCustomer(),
  validate({body: validationSchema.payload}),
  controller.index)

router.post('/create',
  auth.isAuthenticated(),
  auth.isSuperUserActingAsCustomer('write'),
  validate({body: validationSchema.createPayload}),
  controller.create)

router.post('/update/:id',
  auth.isAuthenticated(),
  auth.isSuperUserActingAsCustomer('write'),
  controller.update)

router.get('/unSubscribe/:id',
  auth.isAuthenticated(),
  auth.isSuperUserActingAsCustomer('write'),
  controller.unSubscribe)

router.post('/getDuplicateSubscribers',
  auth.isAuthenticated(),
  auth.isSuperUserActingAsCustomer(),
  multipartyMiddleware,
  controller.getDuplicateSubscribers)

router.post('/sendMessage',
  auth.isAuthenticated(),
  auth.isSuperUserActingAsCustomer('write'),
  attachProviderInfo(),
  multipartyMiddleware,
  controller.sendMessage)

module.exports = router

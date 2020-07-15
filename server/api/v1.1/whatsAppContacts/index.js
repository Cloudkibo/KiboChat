const express = require('express')
const router = express.Router()
const auth = require('../../../auth/auth.service')
const validate = require('express-jsonschema').validate
const validationSchema = require('./validationSchema')
const controller = require('./whatsAppContacts.controller')

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

module.exports = router

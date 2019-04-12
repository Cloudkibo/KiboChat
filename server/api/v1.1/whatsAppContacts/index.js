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

module.exports = router

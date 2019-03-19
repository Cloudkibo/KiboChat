const express = require('express')
const router = express.Router()
const auth = require('../../../auth/auth.service')
const validate = require('express-jsonschema').validate
const validationSchema = require('./validationSchema')
const controller = require('./contacts.controller')
const multiparty = require('connect-multiparty')
const multipartyMiddleware = multiparty()

router.post('/',
  auth.isAuthenticated(),
  controller.index)

router.post('/uploadFile',
  auth.isAuthenticated(),
  multipartyMiddleware,
  validate({body: validationSchema.uploadPayload}),
  controller.uploadFile)

router.post('/uploadNumbers',
  auth.isAuthenticated(),
  validate({body: validationSchema.uploadNumbersPayload}),
  controller.uploadNumbers)

module.exports = router

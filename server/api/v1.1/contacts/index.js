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
  auth.isSuperUserActingAsCustomer(),
  controller.index)

router.post('/uploadFile',
  auth.isAuthenticated(),
  auth.isSuperUserActingAsCustomer('write'),
  multipartyMiddleware,
  validate({body: validationSchema.uploadPayload}),
  controller.uploadFile)

router.post('/uploadNumbers',
  auth.isAuthenticated(),
  auth.isSuperUserActingAsCustomer('write'),
  validate({body: validationSchema.uploadNumbersPayload}),
  controller.uploadNumbers)

router.post('/update/:id',
  auth.isAuthenticated(),
  auth.isSuperUserActingAsCustomer('write'),
  controller.update)

router.get('/fetchLists',
  auth.isAuthenticated(),
  auth.isSuperUserActingAsCustomer(),
  controller.fetchLists)

module.exports = router

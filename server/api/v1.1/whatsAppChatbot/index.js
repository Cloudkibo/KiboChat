'use strict'

const express = require('express')
const router = express.Router()
const controller = require('./whatsAppChatbot.controller')
const auth = require('../../../auth/auth.service')
// const validate = require('express-jsonschema').validate
// const validationSchema = require('./validationSchema')

router.post('/',
  auth.isAuthenticated(),
  auth.isSuperUserActingAsCustomer('write'),
  controller.create)

router.get('/',
  auth.isAuthenticated(),
  auth.isSuperUserActingAsCustomer(),
  controller.fetch)

router.get('/:id/stats/:n',
  auth.isAuthenticated(),
  auth.isSuperUserActingAsCustomer(),
  controller.fetchAnalytics)

router.put('/',
  auth.isAuthenticated(),
  auth.isSuperUserActingAsCustomer('write'),
  controller.update)

module.exports = router

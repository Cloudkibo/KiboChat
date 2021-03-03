const express = require('express')
const router = express.Router()
const auth = require('../../../auth/auth.service')

const controller = require('./superNumber.controller')

router.post('/fetchTemplates',
  auth.isAuthenticated(),
  auth.isSuperUserActingAsCustomer(),
  controller.fetchTemplates)

module.exports = router

const express = require('express')
const router = express.Router()
const auth = require('../../../auth/auth.service')
const controller = require('./companyPreferences.controller')

router.get('/',
  auth.isAuthenticated(),
  auth.isSuperUserActingAsCustomer(),
  controller.fetch)

module.exports = router


'use strict'

var express = require('express')
var controller = require('./controller')

var router = express.Router()
const auth = require('../../../auth/auth.service')

router.get('/agents',
  auth.isAuthenticated(),
  auth.isSuperUserActingAsCustomer(),
  controller.fetchAgents)

module.exports = router

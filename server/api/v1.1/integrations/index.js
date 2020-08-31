
'use strict'

var express = require('express')
var controller = require('./integrations.controller')

var router = express.Router()
const auth = require('../../../auth/auth.service')

router.get('/',
  auth.isAuthenticated(),
  controller.index)

router.post('/update/:id',
  auth.isAuthenticated(),
  controller.update)

module.exports = router

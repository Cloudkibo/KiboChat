'use strict'

let express = require('express')
let controller = require('./passwordresettoken.controller')
let auth = require('../../../auth/auth.service')

let router = express.Router()

router.post('/change',
  auth.isAuthenticated(),
  auth.isSuperUserActingAsCustomer('write'),
  controller.change)

module.exports = router

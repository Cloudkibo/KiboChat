
'use strict'

const express = require('express')

const router = express.Router()

const auth = require('../../../auth/auth.service')
const controller = require('./controller')

router.get('/:platform',
//   auth.isAuthenticated(),
//   auth.isSuperUserActingAsCustomer(),
  controller.index)

module.exports = router

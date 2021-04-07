
'use strict'

var express = require('express')
var controller = require('./controller')

var router = express.Router()
const auth = require('../../../auth/auth.service')

const validate = require('express-jsonschema').validate
const validationSchema = require('./validationSchema')

router.get('/agents',
  auth.isAuthenticated(),
  auth.isSuperUserActingAsCustomer(),
  controller.fetchAgents)

router.post('/agents/remove',
  validate({ body: validationSchema.removePyaload }),
  auth.isAuthenticated(),
  auth.isSuperUserActingAsCustomer(),
  controller.removeAgent)

module.exports = router

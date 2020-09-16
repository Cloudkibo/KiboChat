const express = require('express')
const router = express.Router()
const validate = require('express-jsonschema').validate

const validationSchema = require('./validationSchema')
const controller = require('./m_code.controller')
const auth = require('./../../../auth/auth.service')

router.post('/',
  auth.isAuthenticated(),
  auth.isSuperUserActingAsCustomer('write'),
  auth.doesPlanPermitsThisAction('messenger_code'),
  auth.isUserAllowedToPerformThisAction('create_messenger_codes'),
  validate({body: validationSchema.createCodePayload}),
  controller.index)

module.exports = router

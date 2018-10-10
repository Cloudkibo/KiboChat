const express = require('express')
const router = express.Router()
const validate = require('express-jsonschema').validate
const auth = require('../../../auth/auth.service')

const validationSchema = require('./validationSchema')
const controller = require('./sessions.controller')

router.get('/',
  auth.isAuthenticated(),
  auth.doesPlanPermitsThisAction('livechat'),
  auth.doesRolePermitsThisAction('livechatPermission'),
  controller.index)

module.exports = router

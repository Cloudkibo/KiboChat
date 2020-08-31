
'use strict'

var express = require('express')
var controller = require('./invitations.controller')

const validate = require('express-jsonschema').validate
const validationSchema = require('./validationSchema')

var router = express.Router()
const auth = require('../../../auth/auth.service')

router.get('/',
  auth.isAuthenticated(),
  auth.doesPlanPermitsThisAction('invite_team'),
  auth.doesRolePermitsThisAction('invitationsPermission'),
  controller.index)

router.post('/cancel',
  auth.isAuthenticated(),
  auth.doesPlanPermitsThisAction('invite_team'),
  auth.doesRolePermitsThisAction('invitationsPermission'),
  controller.cancel)

router.post('/invite',
  auth.isAuthenticated(),
  validate({body: validationSchema.invitePayload}),
  controller.invite)

module.exports = router

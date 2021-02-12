'use strict'

const express = require('express')

const router = express.Router()

const controller = require('./sequence.controller')
const auth = require('../../../auth/auth.service')

router.get('/allSequences',
  auth.isAuthenticated(),
  auth.doesPlanPermitsThisAction('sequence_messaging'),
  auth.isUserAllowedToPerformThisAction('view_sequences'),
  controller.allSequences)

module.exports = router

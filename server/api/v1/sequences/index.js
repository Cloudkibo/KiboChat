'use strict'

const express = require('express')

const router = express.Router()

const controller = require('./sequence.controller')
const auth = require('../../../auth/auth.service')

router.get('/allSequences',
  auth.isAuthenticated(),
  controller.allSequences)

module.exports = router

'use strict'

const express = require('express')
const router = express.Router()
const controller = require('./zoomIntegration.controller')
const auth = require('../../../auth/auth.service')

router.get('/users',
  auth.isAuthenticated(),
  controller.getZoomUser)

module.exports = router

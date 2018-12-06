'use strict'

const express = require('express')

const router = express.Router()

const controller = require('./templates.controller')
const auth = require('../../../auth/auth.service')

// todo this is temporary template for DNC, this would be made data driven using above routes
router.get('/getPoliticsBotTemplate', auth.isAuthenticated(), controller.getPoliticsBotTemplate)

module.exports = router

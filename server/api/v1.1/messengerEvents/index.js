'use strict'

const express = require('express')
const router = express.Router()
const sessionsController = require('./sessions.controller')
const auth = require('../../../auth/auth.service')

router.post('/sessions', auth.isItWebhookServer(), sessionsController.index)

module.exports = router

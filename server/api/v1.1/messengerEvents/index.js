'use strict'

const express = require('express')
const router = express.Router()
const sessionsController = require('./sessions.controller')
const auth = require('../../../auth/auth.service')
const messagingReferrals = require('./messagingReferrals.controller')
const landingPage = require('./landingPage.controller')

router.post('/sessions', auth.isItWebhookServer(), sessionsController.index)
router.post('/messagingReferrals', auth.isItWebhookServer(), messagingReferrals.index)
router.post('/landingPage', auth.isItWebhookServer(), landingPage.index)

module.exports = router

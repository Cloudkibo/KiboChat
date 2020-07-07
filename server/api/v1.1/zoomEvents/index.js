'use strict'

const express = require('express')
const router = express.Router()
const controller = require('./controller')
const auth = require('../../../auth/auth.service')

router.post('/uninstallApp', auth.isItWebhookServer(), controller.uninstallApp)

module.exports = router

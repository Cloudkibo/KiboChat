const express = require('express')
const router = express.Router()
const auth = require('../../../auth/auth.service')
const controller = require('./controller')

router.post('/handleUrl',
  auth.isAuthenticated(),
  controller.handleUrl)

module.exports = router

'use strict'

const express = require('express')
const router = express.Router()
const controller = require('./controller')

router.post('/messageReceived',
  controller.messageReceived)

router.post('/messageStatus',
  controller.messageStatus)

module.exports = router

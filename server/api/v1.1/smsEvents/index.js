'use strict'

const express = require('express')
const router = express.Router()
const controller = require('./controller')

router.post('/handleOrderStatus', controller.handleOrderStatus)
router.post('/handleIncomingMessage', controller.handleIncomingMessage)
router.post('/handleMessageDelivery', controller.handleMessageDelivery)

module.exports = router

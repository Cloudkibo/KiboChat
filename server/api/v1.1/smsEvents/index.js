'use strict'

const express = require('express')
const router = express.Router()
const controller = require('./controller')

router.post('/handleOrderStatus',
  controller.handleOrderStatus)

module.exports = router

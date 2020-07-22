'use strict'

const express = require('express')
const router = express.Router()
const controller = require('./controller')
const validate = require('express-jsonschema').validate
const validationSchema = require('./validationSchema')

router.post('/messageReceived',
  validate({body: validationSchema.payload}),
  controller.index)

router.post('/messageStatus',
  validate({body: validationSchema.messageStatus}),
  controller.messageStatus)

module.exports = router

'use strict'

const express = require('express')
const router = express.Router()
const controller = require('./controller')
const validate = require('express-jsonschema').validate
const validationSchema = require('./validationSchema')

router.post('/messageReceived',
  validate({body: validationSchema.payload}),
  controller.index)

module.exports = router

'use strict'

const express = require('express')
const router = express.Router()
const controller = require('./controller')
const validate = require('express-jsonschema').validate
const validationSchema = require('./validationSchema')

router.post('/',
  validate({body: validationSchema.payload}),
  controller.index)

router.post('/whatsApp',
  validate({body: validationSchema.payload}),
  controller.whatsApp)

module.exports = router

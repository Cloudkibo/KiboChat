/**
 * Created by sojharo on 23/11/2020.
 */

'use strict'

const express = require('express')

const router = express.Router()
const controller = require('./api.controller')
const validate = require('express-jsonschema').validate
const validationSchema = require('./validationSchema')

router.post('/subscriberInfo',
  validate({body: validationSchema.subscriberInfoSchema}),
  controller.subscriberInfo)

module.exports = router

const express = require('express')
const router = express.Router()
const validate = require('express-jsonschema').validate

const validationSchema = require('./validationSchema')
const controller = require('./sessions.controller')

router.get('/:_id',
  controller.index)

router.post('/query',
  controller.genericFetch)

module.exports = router

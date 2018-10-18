const express = require('express')
const router = express.Router()
const auth = require('../../../auth/auth.service')
// const validate = require('express-jsonschema').validate

// const validationSchema = require('./validationSchema')
const controller = require('./company.controller')

router.get('/members',
  auth.isAuthenticated(),
  controller.members)

module.exports = router

const express = require('express')
const router = express.Router()
const auth = require('../../../auth/auth.service')
// const validate = require('express-jsonschema').validate

// const validationSchema = require('./validationSchema')
const controller = require('./company.controller')

router.get('/members',
  auth.isAuthenticated(),
  controller.members)

router.get('/getAutomatedOptions',
  auth.isAuthenticated(),
  controller.getAutomatedOptions)

router.post('/invite', auth.isAuthenticated(), controller.invite)

router.post('/updateAutomatedOptions',
  auth.isAuthenticated(),
  auth.hasRole('buyer'),
  controller.updateAutomatedOptions)

module.exports = router

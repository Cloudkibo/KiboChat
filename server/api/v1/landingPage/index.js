const express = require('express')
const router = express.Router()
const auth = require('../../../auth/auth.service')
const validate = require('express-jsonschema').validate

const validationSchema = require('./validationSchema')
const controller = require('./landingPage.controller')

router.get('/',
  auth.isAuthenticated(),
  auth.doesPlanPermitsThisAction('landing_pages'),
  controller.index)

router.post('/',
  auth.isAuthenticated(),
  auth.doesPlanPermitsThisAction('landing_pages'),
  validate({body: validationSchema.createPayload}),
  controller.create)

router.post('/update/:id',
  auth.isAuthenticated(),
  auth.doesPlanPermitsThisAction('landing_pages'),
  validate({body: validationSchema.updatePayload}),
  controller.update)

router.delete('/:id',
  auth.isAuthenticated(),
  auth.doesPlanPermitsThisAction('landing_pages'),
  controller.delete)

module.exports = router

const express = require('express')
const router = express.Router()
const auth = require('../../../auth/auth.service')
const validate = require('express-jsonschema').validate
const validationSchema = require('./validationSchema')
const controller = require('./superNumber.controller')

const validate = require('express-jsonschema').validate
const validationSchema = require('./validationSchema')

router.post('/fetchTemplates',
  auth.isAuthenticated(),
  auth.isSuperUserActingAsCustomer(),
  controller.fetchTemplates)

<<<<<<< HEAD
router.post('/sendManualMessage',
  validate({body: validationSchema.sendManualMessagePayload}),
  auth.isAuthenticated(),
  auth.isSuperUserActingAsCustomer(),
  controller.sendManualMessage)
=======
router.get('/',
  auth.isAuthenticated(),
  auth.isSuperUserActingAsCustomer(),
  controller.index)

router.post('/',
  auth.isAuthenticated(),
  validate({ body: validationSchema.createPayload }),
  auth.isSuperUserActingAsCustomer('write'),
  controller.create)

router.post('/update',
  auth.isAuthenticated(),
  validate({body: validationSchema.updatePayload}),
  auth.isSuperUserActingAsCustomer('write'),
  controller.update)

router.post('/delete',
  auth.isAuthenticated(),
  auth.isSuperUserActingAsCustomer('write'),
  controller.delete)
>>>>>>> 85a356fe64ae024c292703b6d86b95c85c7960fb

module.exports = router

const express = require('express')
const router = express.Router()
const auth = require('../../../auth/auth.service')
const validate = require('express-jsonschema').validate
const validationSchema = require('./validationSchema')
const controller = require('./subscribers.controller')

router.get('/',
  auth.isAuthenticated(),
  auth.isSuperUserActingAsCustomer(),
  controller.index)

router.get('/allSubscribers',
  auth.isAuthenticated(),
  auth.isSuperUserActingAsCustomer(),
  controller.allSubscribers)

router.get('/allLocales',
  auth.isAuthenticated(),
  auth.isSuperUserActingAsCustomer(),
  controller.allLocales)

router.post('/getAll',
  auth.isAuthenticated(),
  auth.isSuperUserActingAsCustomer(),
  controller.getAll)

router.get('/subscribeBack/:id',
  auth.isAuthenticated('write'),
  auth.isSuperUserActingAsCustomer(),
  controller.subscribeBack)

router.get('/updateData',
  auth.isAuthenticated(),
  auth.isSuperUserActingAsCustomer('write'),
  controller.updateData)

router.post('/updatePicture',
  auth.isAuthenticated(),
  auth.isSuperUserActingAsCustomer(),
  controller.updatePicture)

router.post('/unSubscribe',
  auth.isAuthenticated(),
  auth.isSuperUserActingAsCustomer('write'),
  auth.doesPlanPermitsThisAction('livechat'),
  auth.doesRolePermitsThisAction('livechatPermission'),
  validate({body: validationSchema.unSubscribePayload}),
  controller.unSubscribe)

module.exports = router

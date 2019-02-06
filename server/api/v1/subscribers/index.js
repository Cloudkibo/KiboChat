const express = require('express')
const router = express.Router()
const auth = require('../../../auth/auth.service')
const validate = require('express-jsonschema').validate
const validationSchema = require('./validationSchema')

const controller = require('./subscribers.controller')

router.get('/',
  auth.isAuthenticated(),
  controller.index)

router.get('/allSubscribers',
  auth.isAuthenticated(),
  controller.allSubscribers)

router.get('/allLocales',
  auth.isAuthenticated(),
  controller.allLocales)

router.post('/getAll',
  auth.isAuthenticated(),
  controller.getAll)

router.get('/subscribeBack/:id',
  auth.isAuthenticated(),
  controller.subscribeBack)

router.post('/updatePicture',
  auth.isAuthenticated(),
  controller.updatePicture)

router.get('/updateData',
  auth.isAuthenticated(),
  controller.updateData)

router.post('/unSubscribe',
  auth.isAuthenticated(),
  auth.doesPlanPermitsThisAction('livechat'),
  auth.doesRolePermitsThisAction('livechatPermission'),
  validate({body: validationSchema.unSubscribePayload}),
  controller.unSubscribe)

module.exports = router

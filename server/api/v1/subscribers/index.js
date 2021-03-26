const express = require('express')
const router = express.Router()
const auth = require('../../../auth/auth.service')
const validate = require('express-jsonschema').validate
const validationSchema = require('./validationSchema')
const controller = require('./subscribers.controller')

router.get('/',
  auth.isAuthenticated(),
  auth.isSuperUserActingAsCustomer(),
  auth.doesPlanPermitsThisAction('manage_subscribers'),
  auth.isUserAllowedToPerformThisAction('view_subscribers'),
  controller.index)

router.get('/allSubscribers',
  auth.isAuthenticated(),
  auth.isSuperUserActingAsCustomer(),
  auth.doesPlanPermitsThisAction('manage_subscribers'),
  auth.isUserAllowedToPerformThisAction('view_subscribers'),
  controller.allSubscribers)

router.get('/allLocales',
  auth.isAuthenticated(),
  auth.isSuperUserActingAsCustomer(),
  auth.doesPlanPermitsThisAction('manage_subscribers'),
  auth.isUserAllowedToPerformThisAction('view_subscribers'),
  controller.allLocales)

router.post('/getAll',
  auth.isAuthenticated(),
  auth.isSuperUserActingAsCustomer(),
  controller.getAll)

router.get('/subscribeBack/:id',
  auth.isAuthenticated(),
  auth.isSuperUserActingAsCustomer('write'),
  auth.doesPlanPermitsThisAction('unsubscribe_subscribers'),
  auth.isUserAllowedToPerformThisAction('unsubsubscribe_subscribers'),
  controller.subscribeBack)

router.get('/updateData',
  auth.isAuthenticated(),
  auth.isSuperUserActingAsCustomer('write'),
  auth.doesPlanPermitsThisAction('manage_subscribers'),
  auth.isUserAllowedToPerformThisAction('view_subscribers'),
  controller.updateData)

router.post('/updatePicture',
  auth.isAuthenticated(),
  auth.isSuperUserActingAsCustomer(),
  auth.doesPlanPermitsThisAction('manage_subscribers'),
  auth.isUserAllowedToPerformThisAction('view_subscribers'),
  controller.updatePicture)

router.post('/unSubscribe',
  auth.isAuthenticated(),
  auth.isSuperUserActingAsCustomer('write'),
  auth.doesPlanPermitsThisAction('unsubscribe_subscribers'),
  auth.isUserAllowedToPerformThisAction('unsubsubscribe_subscribers'),
  validate({body: validationSchema.unSubscribePayload}),
  controller.unSubscribe)

module.exports = router

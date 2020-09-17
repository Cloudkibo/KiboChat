const express = require('express')
const router = express.Router()
const auth = require('../../../auth/auth.service')
const validate = require('express-jsonschema').validate

const validationSchema = require('./validationSchema')
const controller = require('./commentCapture.controller')

router.get('/',
  auth.isAuthenticated(),
  auth.isSuperUserActingAsCustomer(),
  auth.doesPlanPermitsThisAction('comment_capture'),
  auth.isUserAllowedToPerformThisAction('view_comment_capture_rules'),
  controller.index)

router.get('/:id',
  auth.isAuthenticated(),
  auth.isSuperUserActingAsCustomer(),
  controller.viewPost)

router.post('/create',
  auth.isAuthenticated(),
  auth.isSuperUserActingAsCustomer('write'),
  auth.doesPlanPermitsThisAction('comment_capture'),
  auth.isUserAllowedToPerformThisAction('create_comment_capture_rules'),
  controller.create)

router.post('/edit',
  auth.isAuthenticated(),
  auth.isSuperUserActingAsCustomer('write'),
  auth.doesPlanPermitsThisAction('comment_capture'),
  auth.isUserAllowedToPerformThisAction('update_comment_capture_rules'),
  validate({body: validationSchema.postUpdatePayload}),
  controller.edit)

router.delete('/delete/:id',
  auth.isAuthenticated(),
  auth.isSuperUserActingAsCustomer('write'),
  auth.doesPlanPermitsThisAction('comment_capture'),
  auth.isUserAllowedToPerformThisAction('delete_comment_capture_rules'),
  controller.delete)

module.exports = router

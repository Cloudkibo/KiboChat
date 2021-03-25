/**
 * Created by sojharo on 27/07/2017.
 */

'use strict'

const express = require('express')

const router = express.Router()

const auth = require('../../../auth/auth.service')
const controller = require('./tags.controller')

const validate = require('express-jsonschema').validate
const validationSchema = require('./validationSchema')

router.get('/',
  auth.isAuthenticated(),
  auth.isSuperUserActingAsCustomer(),
  auth.doesPlanPermitsThisAction('tags'),
  auth.isUserAllowedToPerformThisAction('view_tags'),
  controller.index)

router.post('/',
  auth.isAuthenticated(),
  auth.isSuperUserActingAsCustomer('write'),
  auth.doesPlanPermitsThisAction('tags'),
  auth.isUserAllowedToPerformThisAction('create_tags'),
  validate({body: validationSchema.createPayload}),
  controller.create)

router.post('/rename',
  auth.isAuthenticated(),
  auth.isSuperUserActingAsCustomer('write'),
  auth.doesPlanPermitsThisAction('tags'),
  auth.isUserAllowedToPerformThisAction('update_tags'),
  validate({body: validationSchema.renamePayload}),
  controller.rename)

router.post('/delete',
  auth.isAuthenticated(),
  auth.isSuperUserActingAsCustomer('write'),
  auth.doesPlanPermitsThisAction('tags'),
  auth.isUserAllowedToPerformThisAction('delete_tags'),
  validate({body: validationSchema.deletePayload}),
  controller.delete)

router.post('/assign',
  auth.isAuthenticated(),
  auth.isSuperUserActingAsCustomer('write'),
  auth.doesPlanPermitsThisAction('tags'),
  auth.isUserAllowedToPerformThisAction('assign_tags'),
  validate({body: validationSchema.assignPayload}),
  controller.assign)

router.post('/unassign',
  auth.isAuthenticated(),
  auth.isSuperUserActingAsCustomer('write'),
  auth.doesPlanPermitsThisAction('tags'),
  auth.isUserAllowedToPerformThisAction('assign_tags'),
  validate({body: validationSchema.assignPayload}),
  controller.unassign)

router.post('/subscribertags',
  auth.isAuthenticated(),
  auth.isSuperUserActingAsCustomer('write'),
  auth.doesPlanPermitsThisAction('tags'),
  auth.isUserAllowedToPerformThisAction('delete_tags'),
  validate({body: validationSchema.subscriberTagsPayload}),
  controller.subscribertags)

module.exports = router

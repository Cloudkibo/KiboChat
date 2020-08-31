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
  controller.index)

router.post('/',
  auth.isAuthenticated(),
  validate({body: validationSchema.createPayload}),
  controller.create)

router.post('/rename',
  auth.isAuthenticated(),
  validate({body: validationSchema.renamePayload}),
  controller.rename)

router.post('/delete',
  auth.isAuthenticated(),
  validate({body: validationSchema.deletePayload}),
  controller.delete)

router.post('/assign',
  auth.isAuthenticated(),
  validate({body: validationSchema.assignPayload}),
  controller.assign)

router.post('/unassign',
  auth.isAuthenticated(),
  validate({body: validationSchema.assignPayload}),
  controller.unassign)

router.post('/subscribertags',
  auth.isAuthenticated(),
  validate({body: validationSchema.subscriberTagsPayload}),
  controller.subscribertags)

module.exports = router

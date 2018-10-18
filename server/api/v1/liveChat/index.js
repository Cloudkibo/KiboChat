'use strict'

const express = require('express')
const router = express.Router()
const controller = require('./liveChat.controller')
const auth = require('../../../auth/auth.service')
const validate = require('express-jsonschema').validate
const validationSchema = require('./validationSchema')

router.post('/',
  auth.isAuthenticated(),
  auth.doesPlanPermitsThisAction('livechat'),
  auth.doesRolePermitsThisAction('livechatPermission'),
  validate({body: validationSchema.createPayload}),
  controller.create)

router.post('/updateUrl',
  auth.isAuthenticated(),
  auth.doesPlanPermitsThisAction('livechat'),
  auth.doesRolePermitsThisAction('livechatPermission'),
  validate({body: validationSchema.updatePayload}),
  controller.update)

router.post('/getUrlMeta',
  auth.isAuthenticated(),
  auth.doesPlanPermitsThisAction('livechat'),
  auth.doesRolePermitsThisAction('livechatPermission'),
  validate({body: validationSchema.urlMetaPayload}),
  controller.geturlmeta)

router.post('/search',
  auth.isAuthenticated(),
  auth.doesPlanPermitsThisAction('livechat'),
  auth.doesRolePermitsThisAction('livechatPermission'),
  validate({body: validationSchema.searchPayload}),
  controller.search)

router.post('/:session_id',
  auth.isAuthenticated(),
  auth.doesPlanPermitsThisAction('livechat'),
  auth.doesRolePermitsThisAction('livechatPermission'),
  validate({body: validationSchema.indexPayload}),
  controller.index)

module.exports = router

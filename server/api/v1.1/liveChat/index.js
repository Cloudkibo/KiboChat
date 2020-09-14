'use strict'

const express = require('express')
const router = express.Router()
const controller = require('./liveChat.controller')
const auth = require('../../../auth/auth.service')
const validate = require('express-jsonschema').validate
const validationSchema = require('./validationSchema')
const { checkSMPStatus } = require('../../global/middleware')

router.post('/',
  auth.isAuthenticated(),
  auth.isSuperUserActingAsCustomer('write'),
  auth.doesPlanPermitsThisAction('livechat'),
  auth.doesRolePermitsThisAction('livechatPermission'),
  validate({body: validationSchema.createPayload}),
  controller.create)

router.post('/getUrlMeta',
  auth.isAuthenticated(),
  auth.isSuperUserActingAsCustomer(),
  auth.doesPlanPermitsThisAction('livechat'),
  auth.doesRolePermitsThisAction('livechatPermission'),
  validate({body: validationSchema.urlMetaPayload}),
  controller.geturlmeta)

router.post('/search',
  auth.isAuthenticated(),
  auth.isSuperUserActingAsCustomer(),
  auth.doesPlanPermitsThisAction('livechat'),
  auth.doesRolePermitsThisAction('livechatPermission'),
  validate({body: validationSchema.searchPayload}),
  controller.search)

router.post('/:subscriber_id',
  auth.isAuthenticated(),
  auth.isSuperUserActingAsCustomer(),
  auth.doesPlanPermitsThisAction('livechat'),
  auth.doesRolePermitsThisAction('livechatPermission'),
  controller.index)

router.get('/SMPStatus',
  auth.isAuthenticated(),
  auth.isSuperUserActingAsCustomer(),
  checkSMPStatus(),
  controller.SMPStatus)

module.exports = router

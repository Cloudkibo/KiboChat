const express = require('express')
const router = express.Router()
const controller = require('./liveChat.controller')
const auth = require('../../../auth/auth.service')
const validate = require('express-jsonschema').validate

const validationSchema = require('./validationSchema')
/*
* auth.isAuthenticated(),
* auth.doesPlanPermitsThisAction('livechat'),
* auth.doesRolePermitsThisAction('livechatPermission'),
*/
router.post('/',
  auth.isAuthenticated(),
  validate({body: validationSchema.createPayload}),
  controller.create)

router.post('/update',
  auth.isAuthenticated(),
  validate({body: validationSchema.updatePayload}),
  controller.update)

router.post('/getUrlMeta', auth.isAuthenticated(), validate({body: validationSchema.urlMetaPayload}), controller.getUrlMeta)

router.post('/search',
  auth.isAuthenticated(),
  validate({body: validationSchema.searchPayload}),
  controller.search)

router.post('/:session_id',
  auth.isAuthenticated(),
  validate({body: validationSchema.indexPayload}),
  controller.index)

module.exports = router

const express = require('express')
const router = express.Router()
const validate = require('express-jsonschema').validate
const auth = require('../../../auth/auth.service')

const validationSchema = require('./validationSchema')
const controller = require('./sessions.controller')

router.post('/getOpenSessions',
  auth.isAuthenticated(),
  auth.isSuperUserActingAsCustomer(),
  auth.doesPlanPermitsThisAction('livechat'),
  auth.isUserAllowedToPerformThisAction('manage_livechat'),
  validate({body: validationSchema.openSessionsPayload}),
  controller.fetchOpenSessions)

router.post('/getClosedSessions',
  auth.isAuthenticated(),
  auth.isSuperUserActingAsCustomer(),
  auth.doesPlanPermitsThisAction('livechat'),
  auth.isUserAllowedToPerformThisAction('manage_livechat'),
  validate({body: validationSchema.openSessionsPayload}),
  controller.fetchResolvedSessions)

router.get('/markread/:id',
  auth.isAuthenticated(),
  auth.isSuperUserActingAsCustomer('write'),
  auth.doesPlanPermitsThisAction('livechat'),
  auth.isUserAllowedToPerformThisAction('manage_livechat'),
  controller.markread)

router.get('/:id',
  auth.isAuthenticated(),
  auth.isSuperUserActingAsCustomer(),
  auth.doesPlanPermitsThisAction('livechat'),
  auth.isUserAllowedToPerformThisAction('manage_livechat'),
  controller.show)

router.post('/single',
  auth.isAuthenticated(),
  auth.isSuperUserActingAsCustomer(),
  auth.doesPlanPermitsThisAction('livechat'),
  auth.doesRolePermitsThisAction('livechatPermission'),
  controller.singleSession)

router.post('/changeStatus',
  auth.isAuthenticated(),
  auth.isSuperUserActingAsCustomer('write'),
  auth.doesPlanPermitsThisAction('livechat'),
  auth.isUserAllowedToPerformThisAction('manage_livechat'),
  validate({body: validationSchema.changeStatusPayload}),
  controller.changeStatus)

router.post('/assignAgent',
  auth.isAuthenticated(),
  auth.isSuperUserActingAsCustomer('write'),
  auth.doesPlanPermitsThisAction('livechat'),
  auth.doesRolePermitsThisAction('livechatPermission'),
  auth.doesPlanPermitsThisAction('assign_sessions'),
  auth.isUserAllowedToPerformThisAction('assign_session_agent'),
  validate({body: validationSchema.assignAgentPayload}),
  controller.assignAgent)

router.post('/assignTeam',
  auth.isAuthenticated(),
  auth.isSuperUserActingAsCustomer('write'),
  auth.doesPlanPermitsThisAction('livechat'),
  auth.doesRolePermitsThisAction('livechatPermission'),
  auth.doesPlanPermitsThisAction('assign_sessions'),
  auth.isUserAllowedToPerformThisAction('assign_session_team'),
  validate({body: validationSchema.assignTeamPayload}),
  controller.assignTeam)

router.post('/updatePendingResponse',
  auth.isAuthenticated(),
  auth.isSuperUserActingAsCustomer('write'),
  auth.doesPlanPermitsThisAction('livechat'),
  auth.doesRolePermitsThisAction('livechatPermission'),
  auth.doesPlanPermitsThisAction('pending_chat_flag'),
  auth.isUserAllowedToPerformThisAction('manage_livechat'),
  validate({body: validationSchema.updatePendingResponsePayload}),
  controller.updatePendingResponse)

router.post('/updatePauseChatbot',
  auth.isAuthenticated(),
  auth.isSuperUserActingAsCustomer('write'),
  validate({body: validationSchema.updatePauseChatbotPayload}),
  controller.updatePauseChatbot)

router.post('/query',
  controller.genericFind)

module.exports = router

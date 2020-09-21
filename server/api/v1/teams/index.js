const express = require('express')
const router = express.Router()
const auth = require('../../../auth/auth.service')
const validate = require('express-jsonschema').validate

const validationSchema = require('./validationSchema')
const controller = require('./teams.controller')

router.post('/',
  auth.isAuthenticated(),
  auth.isSuperUserActingAsCustomer(),
  auth.doesPlanPermitsThisAction('team_members_management'),
  auth.isUserAllowedToPerformThisAction('view_teams'),
  controller.index)

router.post('/create',
  auth.isAuthenticated(),
  auth.isSuperUserActingAsCustomer('write'),
  auth.doesPlanPermitsThisAction('team_members_management'),
  auth.isUserAllowedToPerformThisAction('create_teams'),
  validate({body: validationSchema.teamPayload}),
  controller.createTeam)

router.post('/update',
  auth.isAuthenticated(),
  auth.isSuperUserActingAsCustomer('write'),
  auth.doesPlanPermitsThisAction('team_members_management'),
  auth.isUserAllowedToPerformThisAction('update_teams'),
  validate({body: validationSchema.teamUpdatePayload}),
  controller.updateTeam)

router.delete('/delete/:id',
  auth.isAuthenticated(),
  auth.isSuperUserActingAsCustomer('write'),
  auth.doesPlanPermitsThisAction('team_members_management'),
  auth.isUserAllowedToPerformThisAction('delete_teams'),
  controller.deleteTeam)

router.post('/addAgent',
  auth.isAuthenticated(),
  auth.isSuperUserActingAsCustomer('write'),
  auth.doesPlanPermitsThisAction('team_members_management'),
  auth.isUserAllowedToPerformThisAction('update_teams'),
  validate({body: validationSchema.agentPayload}),
  controller.addAgent)

router.post('/addPage',
  auth.isAuthenticated(),
  auth.isSuperUserActingAsCustomer('write'),
  auth.doesPlanPermitsThisAction('team_members_management'),
  auth.isUserAllowedToPerformThisAction('update_teams'),
  validate({body: validationSchema.pagePayload}),
  controller.addPage)

router.post('/removeAgent',
  auth.isAuthenticated(),
  auth.isSuperUserActingAsCustomer('write'),
  auth.doesPlanPermitsThisAction('team_members_management'),
  auth.isUserAllowedToPerformThisAction('update_teams'),
  controller.removeAgent)

router.post('/removePage',
  auth.isAuthenticated(),
  auth.isSuperUserActingAsCustomer('write'),
  auth.doesPlanPermitsThisAction('team_members_management'),
  auth.isUserAllowedToPerformThisAction('update_teams'),
  controller.removePage)

router.get('/fetchAgents/:id',
  auth.isAuthenticated(),
  auth.isSuperUserActingAsCustomer(),
  auth.doesPlanPermitsThisAction('team_members_management'),
  auth.isUserAllowedToPerformThisAction('update_teams'),
  controller.fetchAgents)

router.get('/fetchPages/:id',
  auth.isAuthenticated(),
  auth.isSuperUserActingAsCustomer(),
  auth.doesPlanPermitsThisAction('team_members_management'),
  auth.isUserAllowedToPerformThisAction('update_teams'),
  controller.fetchPages)

module.exports = router

const express = require('express')
const router = express.Router()
const auth = require('../../../auth/auth.service')
const validate = require('express-jsonschema').validate

const validationSchema = require('./validationSchema')
const controller = require('./teams.controller')

router.post('/',
  auth.isAuthenticated(),
  auth.isSuperUserActingAsCustomer(),
  controller.index)

router.post('/create',
  auth.isAuthenticated(),
  auth.isSuperUserActingAsCustomer('write'),
  validate({body: validationSchema.teamPayload}),
  controller.createTeam)

router.post('/update',
  auth.isAuthenticated(),
  auth.isSuperUserActingAsCustomer('write'),
  validate({body: validationSchema.teamUpdatePayload}),
  controller.updateTeam)

router.delete('/delete/:id',
  auth.isAuthenticated(),
  auth.isSuperUserActingAsCustomer('write'),
  controller.deleteTeam)

router.post('/addAgent',
  auth.isAuthenticated(),
  auth.isSuperUserActingAsCustomer('write'),
  validate({body: validationSchema.agentPayload}),
  controller.addAgent)

router.post('/addPage',
  auth.isAuthenticated(),
  auth.isSuperUserActingAsCustomer('write'),
  validate({body: validationSchema.pagePayload}),
  controller.addPage)

router.post('/removeAgent',
  auth.isAuthenticated(),
  auth.isSuperUserActingAsCustomer('write'),
  controller.removeAgent)

router.post('/removePage',
  auth.isAuthenticated(),
  auth.isSuperUserActingAsCustomer('write'),
  controller.removePage)

router.get('/fetchAgents/:id',
  auth.isAuthenticated(),
  auth.isSuperUserActingAsCustomer(),
  controller.fetchAgents)

router.get('/fetchPages/:id',
  auth.isAuthenticated(),
  auth.isSuperUserActingAsCustomer(),
  controller.fetchPages)

module.exports = router

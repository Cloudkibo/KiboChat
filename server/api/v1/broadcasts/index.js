'use strict'

const express = require('express')

const router = express.Router()

const validate = require('express-jsonschema').validate
const validationSchema = require('./validationSchema')
const controller = require('./broadcasts.controller')
const auth = require('../../../auth/auth.service')
const multiparty = require('connect-multiparty')
const multipartyMiddleware = multiparty()

router.post('/upload',
  auth.isAuthenticated(),
  auth.doesPlanPermitsThisAction('broadcasts'),
  auth.doesRolePermitsThisAction('broadcastPermission'),
  multipartyMiddleware,
  controller.upload)

router.get('/delete/:id',
  auth.isAuthenticated(),
  auth.doesPlanPermitsThisAction('broadcasts'),
  auth.doesRolePermitsThisAction('broadcastPermission'),
  controller.delete)

router.post('/addButton',
  auth.isAuthenticated(),
  auth.doesPlanPermitsThisAction('broadcasts'),
  auth.doesRolePermitsThisAction('broadcastPermission'),
  validate({body: validationSchema.addButtonPayload}),
  controller.addButton)

router.post('/editButton',
  auth.isAuthenticated(),
  auth.doesPlanPermitsThisAction('broadcasts'),
  auth.doesRolePermitsThisAction('broadcastPermission'),
  validate({body: validationSchema.editButtonPayload}),
  controller.editButton)

router.post('/sendConversation',
  auth.isAuthenticated(),
  auth.doesPlanPermitsThisAction('broadcasts'),
  auth.doesRolePermitsThisAction('broadcastPermission'),
  controller.sendConversation)

router.delete('/deleteButton/:id',
  auth.isAuthenticated(),
  auth.doesPlanPermitsThisAction('broadcasts'),
  auth.doesRolePermitsThisAction('broadcastPermission'),
  controller.deleteButton)

router.get('/download/:id', controller.download)
module.exports = router

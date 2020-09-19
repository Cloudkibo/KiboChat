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
  auth.isSuperUserActingAsCustomer('write'),
  auth.doesPlanPermitsThisAction('broadcasts'),
  auth.isUserAllowedToPerformThisAction('create_broadcasts'),
  multipartyMiddleware,
  controller.upload)

router.post('/uploadRecording',
  auth.isAuthenticated(),
  auth.isSuperUserActingAsCustomer('write'),
  auth.doesPlanPermitsThisAction('broadcasts'),
  auth.isUserAllowedToPerformThisAction('create_broadcasts'),
  multipartyMiddleware,
  controller.uploadRecording)

router.get('/delete/:id',
  auth.isAuthenticated(),
  auth.isSuperUserActingAsCustomer('write'),
  auth.doesPlanPermitsThisAction('broadcasts'),
  auth.isUserAllowedToPerformThisAction('create_broadcasts'),
  controller.delete)

router.post('/addButton',
  auth.isAuthenticated(),
  auth.isSuperUserActingAsCustomer('write'),
  auth.doesPlanPermitsThisAction('broadcasts'),
  auth.isUserAllowedToPerformThisAction('create_broadcasts'),
  validate({body: validationSchema.addButtonPayload}),
  controller.addButton)

router.post('/editButton',
  auth.isAuthenticated(),
  auth.isSuperUserActingAsCustomer('write'),
  auth.doesPlanPermitsThisAction('broadcasts'),
  auth.isUserAllowedToPerformThisAction('create_broadcasts'),
  validate({body: validationSchema.editButtonPayload}),
  controller.editButton)

router.post('/sendConversation',
  auth.isAuthenticated(),
  auth.isSuperUserActingAsCustomer('write'),
  auth.doesPlanPermitsThisAction('broadcasts'),
  auth.isUserAllowedToPerformThisAction('create_broadcasts'),
  controller.sendConversation)

router.delete('/deleteButton/:id',
  auth.isAuthenticated(),
  auth.isSuperUserActingAsCustomer('write'),
  auth.doesPlanPermitsThisAction('broadcasts'),
  auth.isUserAllowedToPerformThisAction('create_broadcasts'),
  controller.deleteButton)

router.post('/urlMetaData/',
  auth.isAuthenticated(),
  auth.isSuperUserActingAsCustomer(),
  controller.urlMetaData)

router.get('/download/:id', controller.download)

module.exports = router

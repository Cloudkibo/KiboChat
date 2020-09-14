const express = require('express')
const router = express.Router()
const auth = require('../../../auth/auth.service')
const validate = require('express-jsonschema').validate

const controller = require('./chatbots.controller')
const validationSchema = require('./validationSchema')

router.post('/',
  auth.isAuthenticated(),
  auth.isSuperUserActingAsCustomer('write'),
  validate({ body: validationSchema.createPayload }),
  controller.create)

router.get('/',
  auth.isAuthenticated(),
  auth.isSuperUserActingAsCustomer(),
  controller.index)

router.put('/',
  auth.isAuthenticated(),
  validate({ body: validationSchema.updatePayload }),
  auth.isSuperUserActingAsCustomer('write'),
  controller.update)

router.get('/:id/details',
  auth.isAuthenticated(),
  auth.isSuperUserActingAsCustomer(),
  controller.details)

router.get('/:id/stats/:n',
  auth.isAuthenticated(),
  auth.isSuperUserActingAsCustomer(),
  controller.stats)

router.post('/downloadAnalytics',
  auth.isAuthenticated(),
  auth.isSuperUserActingAsCustomer('write'),
  controller.exportData)

router.get('/:id/fetch',
  auth.isAuthenticated(),
  auth.isSuperUserActingAsCustomer(),
  controller.fetchChatbot)

router.delete('/:id',
  auth.isAuthenticated(),
  auth.isSuperUserActingAsCustomer('write'),
  controller.delete)

router.get('/:id/fetchBackup',
  auth.isAuthenticated(),
  auth.isSuperUserActingAsCustomer(),
  controller.fetchBackup)

router.post('/createBackup',
  auth.isAuthenticated(),
  validate({ body: validationSchema.backupPayload }),
  auth.isSuperUserActingAsCustomer('write'),
  controller.createBackup)

router.post('/restoreBackup',
  auth.isAuthenticated(),
  validate({ body: validationSchema.backupPayload }),
  auth.isSuperUserActingAsCustomer('write'),
  controller.restoreBackup)

router.get('/url/:id',
  controller.redirectToUrl)

module.exports = router

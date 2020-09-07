const express = require('express')
const router = express.Router()
const auth = require('../../../auth/auth.service')
const validate = require('express-jsonschema').validate

const controller = require('./chatbots.controller')
const validationSchema = require('./validationSchema')

router.post('/',
  auth.isAuthenticated(),
  validate({ body: validationSchema.createPayload }),
  controller.create)

router.post('/shopifyChatbot',
  auth.isAuthenticated(),
  validate({ body: validationSchema.createPayload }),
  controller.createUpdateShopifyChatbot)

router.get('/',
  auth.isAuthenticated(),
  controller.index)

router.put('/',
  auth.isAuthenticated(),
  validate({ body: validationSchema.updatePayload }),
  controller.update)

router.get('/:id/details',
  auth.isAuthenticated(),
  controller.details)

router.get('/:id/stats/:n',
  auth.isAuthenticated(),
  controller.stats)

router.post('/downloadAnalytics',
  auth.isAuthenticated(),
  controller.exportData)

router.get('/:id/fetch',
  auth.isAuthenticated(),
  controller.fetchChatbot)

router.delete('/:id',
  auth.isAuthenticated(),
  controller.delete)

router.get('/:id/fetchBackup',
  auth.isAuthenticated(),
  controller.fetchBackup)

router.post('/createBackup',
  auth.isAuthenticated(),
  validate({ body: validationSchema.backupPayload }),
  controller.createBackup)

router.post('/restoreBackup',
  auth.isAuthenticated(),
  validate({ body: validationSchema.backupPayload }),
  controller.restoreBackup)

router.get('/url/:id',
  controller.redirectToUrl)

module.exports = router

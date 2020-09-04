const express = require('express')
const router = express.Router()
const auth = require('../../../auth/auth.service')
const validate = require('express-jsonschema').validate

const controller = require('./chatbots.controller')
const validationSchema = require('./validationSchema')

router.post('/',
  auth.isAuthenticated(),
  auth.doesPlanPermitsThisAction('chatbot_automation'),
  auth.isUserAllowedToPerformThisAction('create_chatbot_automation'),
  validate({ body: validationSchema.createPayload }),
  controller.create)

router.get('/',
  auth.isAuthenticated(),
  auth.doesPlanPermitsThisAction('chatbot_automation'),
  auth.isUserAllowedToPerformThisAction('configure_chatbot_automation'),
  controller.index)

router.put('/',
  auth.isAuthenticated(),
  auth.doesPlanPermitsThisAction('chatbot_automation'),
  auth.isUserAllowedToPerformThisAction('update_chatbot_automation'),
  validate({ body: validationSchema.updatePayload }),
  controller.update)

router.get('/:id/details',
  auth.isAuthenticated(),
  auth.doesPlanPermitsThisAction('chatbot_automation'),
  auth.isUserAllowedToPerformThisAction('configure_chatbot_automation'),
  controller.details)

router.get('/:id/stats/:n',
  auth.isAuthenticated(),
  controller.stats)

router.post('/downloadAnalytics',
  controller.exportData)

router.get('/:id/fetch',
  auth.isAuthenticated(),
  auth.doesPlanPermitsThisAction('chatbot_automation'),
  auth.isUserAllowedToPerformThisAction('configure_chatbot_automation'),
  controller.fetchChatbot)

router.delete('/:id',
  auth.isAuthenticated(),
  auth.doesPlanPermitsThisAction('chatbot_automation'),
  auth.isUserAllowedToPerformThisAction('configure_chatbot_automation'),
  controller.delete)

router.get('/:id/fetchBackup',
  auth.isAuthenticated(),
  auth.doesPlanPermitsThisAction('chatbot_automation'),
  auth.isUserAllowedToPerformThisAction('configure_chatbot_automation'),
  controller.fetchBackup)

router.post('/createBackup',
  auth.isAuthenticated(),
  auth.doesPlanPermitsThisAction('chatbot_automation'),
  auth.isUserAllowedToPerformThisAction('configure_chatbot_automation'),
  validate({ body: validationSchema.backupPayload }),
  controller.createBackup)

router.post('/restoreBackup',
  auth.isAuthenticated(),
  auth.doesPlanPermitsThisAction('chatbot_automation'),
  auth.isUserAllowedToPerformThisAction('configure_chatbot_automation'),
  validate({ body: validationSchema.backupPayload }),
  controller.restoreBackup)

router.get('/url/:id',
  controller.redirectToUrl)

module.exports = router

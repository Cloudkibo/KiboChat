const express = require('express')
const router = express.Router()
const auth = require('../../../auth/auth.service')
const validate = require('express-jsonschema').validate

const controller = require('./chatbots.controller')
const validationSchema = require('./validationSchema')

router.post('/',
  auth.isAuthenticated(),
  auth.isSuperUserActingAsCustomer('write'),
  auth.doesPlanPermitsThisAction('chatbot_automation'),
  auth.isUserAllowedToPerformThisAction('create_chatbot_automation'),
  validate({ body: validationSchema.createPayload }),
  controller.create)

router.post('/shopifyChatbot',
  auth.isAuthenticated(),
  validate({ body: validationSchema.createPayload }),
  controller.createShopifyChatbot)

router.put('/shopifyChatbot',
  auth.isAuthenticated(),
  validate({ body: validationSchema.updatePayload }),
  controller.updateShopifyChatbot)

router.get('/shopifyChatbotTriggers/:chatbotId',
  auth.isAuthenticated(),
  controller.getShopifyChatbotTriggers)

router.get('/',
  auth.isAuthenticated(),
  auth.isSuperUserActingAsCustomer(),
  auth.doesPlanPermitsThisAction('chatbot_automation'),
  auth.isUserAllowedToPerformThisAction('configure_chatbot_automation'),
  controller.index)

router.put('/',
  auth.isAuthenticated(),
  auth.doesPlanPermitsThisAction('chatbot_automation'),
  auth.isUserAllowedToPerformThisAction('update_chatbot_automation'),
  validate({ body: validationSchema.updatePayload }),
  auth.isSuperUserActingAsCustomer('write'),
  controller.update)

router.get('/:id/details',
  auth.isAuthenticated(),
  auth.isSuperUserActingAsCustomer(),
  auth.doesPlanPermitsThisAction('chatbot_automation'),
  auth.isUserAllowedToPerformThisAction('configure_chatbot_automation'),
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
  auth.doesPlanPermitsThisAction('chatbot_automation'),
  auth.isUserAllowedToPerformThisAction('configure_chatbot_automation'),
  controller.fetchChatbot)

router.delete('/:id',
  auth.isAuthenticated(),
  auth.isSuperUserActingAsCustomer('write'),
  auth.doesPlanPermitsThisAction('chatbot_automation'),
  auth.isUserAllowedToPerformThisAction('configure_chatbot_automation'),
  controller.delete)

router.get('/:id/fetchBackup',
  auth.isAuthenticated(),
  auth.isSuperUserActingAsCustomer(),
  auth.doesPlanPermitsThisAction('chatbot_automation'),
  auth.isUserAllowedToPerformThisAction('configure_chatbot_automation'),
  controller.fetchBackup)

router.post('/createBackup',
  auth.isAuthenticated(),
  auth.doesPlanPermitsThisAction('chatbot_automation'),
  auth.isUserAllowedToPerformThisAction('configure_chatbot_automation'),
  validate({ body: validationSchema.backupPayload }),
  auth.isSuperUserActingAsCustomer('write'),
  controller.createBackup)

router.post('/restoreBackup',
  auth.isAuthenticated(),
  auth.doesPlanPermitsThisAction('chatbot_automation'),
  auth.isUserAllowedToPerformThisAction('configure_chatbot_automation'),
  validate({ body: validationSchema.backupPayload }),
  auth.isSuperUserActingAsCustomer('write'),
  controller.restoreBackup)

router.get('/url/:id',
  controller.redirectToUrl)

module.exports = router

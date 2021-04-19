const config = require('./config/environment/index')
const path = require('path')
const multiparty = require('connect-multiparty')
const multipartyMiddleware = multiparty()
const fs = require('fs')
const Sentry = require('@sentry/node')
const logger = require('../server/components/logger')
const TAG = 'server/routes.js'

module.exports = function (app) {
  // API middlewares go here
  const env = app.get('env')

  app.use('/api/test', require('./api/v1/test'))
  app.use('/api/messengerEvents', require('./api/v1.1/messengerEvents'))
  app.use('/api/subscribers', require('./api/v1/subscribers'))
  app.use('/api/users', require('./api/v1/user'))
  app.use('/api/companyUsers', require('./api/v1/companyUsers'))
  app.use('/api/sessions', require('./api/v1.1/sessions'))
  app.use('/api/notifications', require('./api/v1.1/notifications'))
  app.use('/api/livechat', require('./api/v1.1/liveChat'))
  app.use('/api/bots', require('./api/v1.1/smartReplies'))
  app.use('/api/company', require('./api/v1/companyprofile'))
  app.use('/api/teams', require('./api/v1/teams'))
  app.use('/api/pages', require('./api/v1/pages'))
  app.use('/api/permissions', require('./api/v1/permissions'))
  app.use('/auth', require('./auth'))
  app.use('/api/reset_password', require('./api/v1/passwordresettoken'))
  app.use('/api/broadcasts', require('./api/v1/broadcasts'))
  app.use('/api/sequenceMessaging', require('./api/v1/sequences'))
  app.use('/api/tags', require('./api/v1/tags'))
  app.use('/api/templates', require('./api/v1/templates'))
  app.use('/api/lists', require('./api/v1/lists'))
  app.use('/api/growthtools', require('./api/v1/phoneNumber'))
  app.use('/api/landingPage', require('./api/v1/landingPage'))
  app.use('/api/invitations', require('./api/v1/invitations'))
  app.use('/api/menu', require('./api/v1/menu'))
  app.use('/api/dashboard', require('./api/v1.1/dashboard'))
  app.use('/api/pageReferrals', require('./api/v1.1/pageReferrals'))
  app.use('/api/jsonAd', require('./api/v1.1/jsonAd'))
  app.use('/api/scripts', require('./api/scripts'))
  app.use('/api/custom_fields', require('./api/v1.1/custom_fields'))
  app.use('/api/custom_field_subscribers/', require('./api/v1.1/custom_field_subscribers'))
  app.use('/api/messenger_code', require('./api/v1.1/messenger_code'))
  app.use('/api/post', require('./api/v1.1/commentCapture'))
  app.use('/api/operational', require('./api/v1.1/kiboDash'))
  app.use('/api/smsChat', require('./api/v1.1/smsChat'))
  app.use('/api/smsSessions', require('./api/v1.1/smsSessions'))
  app.use('/api/twilioEvents', require('./api/v1.1/twilioEvents'))
  app.use('/api/contacts', require('./api/v1.1/contacts'))
  app.use('/api/whatsAppChat', require('./api/v1.1/whatsAppChat'))
  app.use('/api/whatsAppSessions', require('./api/v1.1/whatsAppSessions'))
  app.use('/api/whatsAppContacts', require('./api/v1.1/whatsAppContacts'))
  app.use('/api/whatsAppDashboard', require('./api/v1.1/whatsAppDashboard'))
  app.use('/api/smsDashboard', require('./api/v1.1/smsDashboard'))
  app.use('/api/webhooks', require('./api/v1.1/webhooks'))
  app.use('/api/messageStatistics', require('./api/v1.1/messageStatistics'))
  app.use('/api/email_verification', require('./api/v1.1/verificationtoken'))
  app.use('/api/api_ngp', require('./api/v1.1/api_ngp'))
  app.use('/api/integrations', require('./api/v1.1/integrations'))
  app.use('/api/intents', require('./api/v1.1/intents'))
  app.use('/api/cannedResponses', require('./api/v1.1/cannedResponses'))
  app.use('/api/twilio', require('./api/v1.1/twilio'))
  app.use('/api/chatbots', require('./api/v1.1/chatbots'))
  app.use('/api/messageBlock', require('./api/v1.1/messageBlock'))
  app.use('/api/zoom', require('./api/v1.1/zoomIntegration'))
  app.use('/api/zoomEvents', require('./api/v1.1/zoomEvents'))
  app.use('/api/flockSendEvents', require('./api/v1.1/flockSendEvents'))
  app.options('/api/shopify/newOrderFromWidget', require('cors')())
  app.use('/api/shopify', require('./api/v1.1/shopify'))
  app.use('/api/whatsAppChatbot', require('./api/v1.1/whatsAppChatbot'))
  app.use('/api/whatsAppEvents', require('./api/v1.1/whatsAppEvents'))
  app.use('/api/backdoor', require('./api/v1.1/backdoor'))
  app.use('/api/configure/chatbot', require('./api/v1.1/configureChatbot'))
  app.use('/api/bigcommerce', require('./api/v1.1/bigcommerce'))
  app.use('/api/attachment', require('./api/v1.1/attachment'))
  app.use('/api/airlines', require('./api/v1.1/airlinesChatbot'))
  app.use('/api/messageAlerts', require('./api/v1.1/messageAlerts'))
  app.use('/api/companyPreferences', require('./api/v1.1/companyPreferences'))
  app.use('/api/fbshops', require('./api/v1.1/facebookshops'))
  app.options('/api/supernumber/fetchWidgetInfo', require('cors')())
  app.options('/api/supernumber/storeOptinNumberFromWidget', require('cors')())
  app.options('/api/supernumber/storeWidgetButtonClick', require('cors')())
  app.use('/api/supernumber', require('./api/v1.1/superNumber'))
  app.use('/cod', require('./api/v1.1/superNumber/codLinks'))
  app.use('/api/dialogflow', require('./api/v1.1/dialogflow'))
  app.use('/api/plans', require('./api/v1.1/plans'))
  // auth middleware go here if you authenticate on same server

  app.get('/invoices/:shopId/:fileName', (req, res) => {
    res.sendFile(path.join(config.root, `./invoices/${req.params.shopId}/${req.params.fileName}`))
  })

  app.get('/', (req, res) => {
    res.cookie('environment', config.env,
      { expires: new Date(Date.now() + 900000) })
    res.cookie('url_production', 'https://kibochat.cloudkibo.com',
      { expires: new Date(Date.now() + 900000) })
    res.cookie('url_staging', 'https://skibochat.cloudkibo.com',
      { expires: new Date(Date.now() + 900000) })
    res.cookie('url_development', 'http://localhost:3022',
      { expires: new Date(Date.now() + 900000) })
    res.sendFile(path.join(config.root, 'client/index.html'))
  })

  app.get('/liveChat/*', (req, res) => {
    res.cookie('environment', config.env,
      { expires: new Date(Date.now() + 900000) })
    res.cookie('url_production', 'https://kibochat.cloudkibo.com',
      { expires: new Date(Date.now() + 900000) })
    res.cookie('url_staging', 'https://skibochat.cloudkibo.com',
      { expires: new Date(Date.now() + 900000) })
    res.cookie('url_development', 'http://localhost:3022',
      { expires: new Date(Date.now() + 900000) })
    res.sendFile(path.join(config.root, 'client/index.html'))
  })

  app.get('/integrations/zoom', (req, res) => {
    res.cookie('environment', config.env,
      { expires: new Date(Date.now() + 900000) })
    res.cookie('url_production', 'https://kibochat.cloudkibo.com',
      { expires: new Date(Date.now() + 900000) })
    res.cookie('url_staging', 'https://skibochat.cloudkibo.com',
      { expires: new Date(Date.now() + 900000) })
    res.cookie('url_development', 'http://localhost:3022',
      { expires: new Date(Date.now() + 900000) })
    res.sendFile(path.join(config.root, 'client/index.html'))
  })

  app.get('/alreadyConnected', (req, res) => {
    res.cookie('environment', config.env,
      { expires: new Date(Date.now() + 900000) })
    res.cookie('url_production', 'https://kibochat.cloudkibo.com',
      { expires: new Date(Date.now() + 900000) })
    res.cookie('url_staging', 'https://skibochat.cloudkibo.com',
      { expires: new Date(Date.now() + 900000) })
    res.cookie('url_development', 'http://localhost:3022',
      { expires: new Date(Date.now() + 900000) })
    res.sendFile(path.join(config.root, 'client/index.html'))
  })

  app.get('/successMessage', (req, res) => {
    res.cookie('environment', config.env,
      { expires: new Date(Date.now() + 900000) })
    res.cookie('url_production', 'https://kibochat.cloudkibo.com',
      { expires: new Date(Date.now() + 900000) })
    res.cookie('url_staging', 'https://skibochat.cloudkibo.com',
      { expires: new Date(Date.now() + 900000) })
    res.cookie('url_development', 'http://localhost:3022',
      { expires: new Date(Date.now() + 900000) })
    res.sendFile(path.join(config.root, 'client/index.html'))
  })

  app.get('/ErrorMessage', (req, res) => {
    res.cookie('environment', config.env,
      { expires: new Date(Date.now() + 900000) })
    res.cookie('url_production', 'https://kibochat.cloudkibo.com',
      { expires: new Date(Date.now() + 900000) })
    res.cookie('url_staging', 'https://skibochat.cloudkibo.com',
      { expires: new Date(Date.now() + 900000) })
    res.cookie('url_development', 'http://localhost:3022',
      { expires: new Date(Date.now() + 900000) })
    res.sendFile(path.join(config.root, 'client/index.html'))
  })

  app.post('/uploadHtml',
    multipartyMiddleware,
    (req, res) => {
      let dir = path.resolve(__dirname, '../client/', req.files.bundle.name)

      fs.rename(
        req.files.bundle.path,
        dir,
        err => {
          if (err) {
            return res.status(500).json({
              status: 'failed',
              description: 'internal server error' + JSON.stringify(err)
            })
          }
          return res.status(201).json({ status: 'success', description: 'HTML uploaded' })
        }
      )
    })

  app.get('/react-bundle', (req, res) => {
    res.sendFile(path.join(__dirname, '../../KiboPush/client/public/js', 'bundle.js'))
  })

  app.get('/', (req, res) => {
    res.sendFile('./../client/build/index.html')
  })

  app.route('/:url(api|auth)/*').get((req, res) => {
    res.status(404).send({ url: `${req.originalUrl} not found` })
  }).post((req, res) => {
    res.status(404).send({ url: `${req.originalUrl} not found` })
  })

  app.route('/*').get((req, res) => {
    res.redirect('/')
  }).post((req, res) => {
    res.redirect('/')
  })

  /*
    Setup a general error handler for JsonSchemaValidation errors.
  */
  app.use(function (err, req, res, next) {
    if (err.name === 'JsonSchemaValidation') {
      const responseData = {
        statusText: 'Bad Request',
        jsonSchemaValidation: true,
        validations: err.validations
      }

      const message = err || `JsonSchemaValidation error`
      logger.serverLog(message, `${TAG}: ${req.path ? req.path : req.originalUrl}`, req.body, {responseData}, 'error')

      res.status(400).json(responseData)
    } else {
    // pass error to next error middleware handler
      next(err)
    }
  })

  if (env === 'production' || env === 'staging') {
    app.use(Sentry.Handlers.errorHandler())
    app.use(Sentry.Handlers.requestHandler())
  }
}

const config = require('./config/environment/index')
const Raven = require('raven')
const path = require('path')

module.exports = function (app) {
  // API middlewares go here
  const env = app.get('env')

  app.use('/api/test', require('./api/v1/test'))
  app.use('/api/messengerEvents', require('./api/v1.1/messengerEvents'))
  app.use('/api/subscribers', require('./api/v1/subscribers'))
  app.use('/api/users', require('./api/v1/user'))
  app.use('/api/sessions', require('./api/v1.1/sessions'))
  app.use('/api/notifications', require('./api/v1.1/notifications'))
  app.use('/api/livechat', require('./api/v1.1/liveChat'))
  app.use('/api/bots', require('./api/v1.1/smartReplies'))
  app.use('/api/company', require('./api/v1/companyprofile'))
  app.use('/api/teams', require('./api/v1/teams'))
  app.use('/api/pages', require('./api/v1/pages'))
  app.use('/api/permissions', require('./api/v1/permissions'))
  app.use('/api/api_settings', require('./api/v1/api_settings'))
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
  app.use('/api/twilioEvents', require('./api/v1.1/twilioEvents'))
  app.use('/api/contacts', require('./api/v1.1/contacts'))
  app.use('/api/whatsAppChat', require('./api/v1.1/whatsAppChat'))
  app.use('/api/whatsAppContacts', require('./api/v1.1/whatsAppContacts'))
  app.use('/api/whatsAppDashboard', require('./api/v1.1/whatsAppDashboard'))
  app.use('/api/smsDashboard', require('./api/v1.1/smsDashboard'))

  // auth middleware go here if you authenticate on same server

  app.get('/', (req, res) => {
    res.cookie('environment', config.env,
      {expires: new Date(Date.now() + 900000)})
    res.cookie('url_production', 'https://kibochat.cloudkibo.com',
      {expires: new Date(Date.now() + 900000)})
    res.cookie('url_staging', 'https://skibochat.cloudkibo.com',
      {expires: new Date(Date.now() + 900000)})
    res.cookie('url_development', 'http://localhost:3022',
      {expires: new Date(Date.now() + 900000)})
    // res.sendFile(path.join(config.root, 'client/index.html'))
    res.render('main', { environment: env })
  })

  app.get('/react-bundle', (req, res) => {
    res.sendFile(path.join(__dirname, '../../KiboPush/client/public/js', 'bundle.js'))
  })

  app.get('/', (req, res) => {
    res.sendFile('./../client/build/index.html')
  })

  app.route('/:url(api|auth)/*').get((req, res) => {
    res.status(404).send({url: `${req.originalUrl} not found`})
  }).post((req, res) => {
    res.status(404).send({url: `${req.originalUrl} not found`})
  })

  app.route('/*').get((req, res) => {
    res.redirect('/')
  }).post((req, res) => {
    res.redirect('/')
  })

  if (env === 'production' || env === 'staging') {
    app.use(Raven.errorHandler())
  }
}

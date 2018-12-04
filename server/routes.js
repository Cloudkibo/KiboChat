const config = require('./config/environment/index')

module.exports = function (app) {
  // API middlewares go here
  const env = app.get('env')

  app.use('/api/test', require('./api/v1/test'))
  app.use('/api/messengerEvents', require('./api/v1/messengerEvents'))
  app.use('/api/subscribers', require('./api/v1/subscribers'))
  app.use('/api/users', require('./api/v1/user'))
  app.use('/api/sessions', require('./api/v1/sessions'))
  app.use('/api/notifications', require('./api/v1/notifications'))
  app.use('/api/livechat', require('./api/v1/liveChat'))
  app.use('/api/bots', require('./api/v1/smartReplies'))
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

  // auth middleware go here if you authenticate on same server

  app.get('/', (req, res) => {
    res.cookie('environment', config.env,
      {expires: new Date(Date.now() + 900000)})
    // res.sendFile(path.join(config.root, 'client/index.html'))
    res.render('main', { environment: env })
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
}

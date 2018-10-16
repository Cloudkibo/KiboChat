const config = require('./config/environment/index')

module.exports = function (app) {
  // API middlewares go here
  const env = app.get('env')

  app.use('/api/v1/test', require('./api/v1/test'))
  app.use('/api/v1/messengerEvents', require('./api/v1/messengerEvents'))
  app.use('/api/v1/sessions', require('./api/v1/sessions'))

  // auth middleware go here if you authenticate on same server
  // app.use('/auth', require('./auth'))
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

process.env.NODE_ENV = process.env.NODE_ENV || 'development' // production

const express = require('express')
const config = require('./config/environment/index')

const app = express()
const httpApp = express()

const appObj = (config.env === 'production' || config.env === 'staging') ? app : httpApp

if (config.env === 'production' || config.env === 'staging') {
  const Raven = require('raven')
  Raven.config('https://6c7958e0570f455381d6f17122fbd117:d2041f4406ff4b3cb51290d9b8661a7d@sentry.io/292307', {
    environment: config.env,
    parseUser: ['name', 'email', 'domain', 'role', 'emailVerified']
  }).install()
  appObj.use(Raven.requestHandler())
}

require('./config/express')(appObj)
require('./config/setup')(app, httpApp, config)
require('./routes')(appObj)

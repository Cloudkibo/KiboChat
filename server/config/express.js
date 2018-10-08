/**
 * Express configuration
 */

'use strict'

const express = require('express')
const morgan = require('morgan')
const compression = require('compression')
const bodyParser = require('body-parser')
const methodOverride = require('method-override')
const cookieParser = require('cookie-parser')
const errorHandler = require('errorhandler')
const path = require('path')
const helmet = require('helmet')
const passport = require('passport')
const config = require('./environment/index')

module.exports = function (app) {
  const env = app.get('env')

  /**
     * middleware to compress response body to optimize app
     * (it is better done on nginx proxy level)
     */

  app.use(compression())
  app.use(bodyParser.urlencoded({ extended: true }))
  app.use(bodyParser.json())
  app.use(express.static(path.join(config.root, 'client/build')))

  // app.use(favicon(path.join(config.root, 'client', 'favicon.ico')))

  app.set('views', path.join(config.root, 'client'))
  app.set('view engine', 'pug')

  // Lets you use HTTP verbs such as PUT or DELETE in places where the client doesn't support it.
  app.use(methodOverride())

  // Parse Cookie header and populate req.cookies with an object keyed by the cookie names.
  app.use(cookieParser())

  app.use(passport.initialize())

  if (env === 'production') {
    /**
         * Helmet can help protect your app from some
         * well-known web vulnerabilities by setting
         * HTTP headers appropriately.
         */
    app.use(helmet())
  }

  if (env === 'development' || env === 'test') {
    /**
         * HTTP request logger
         */

    app.use(morgan('dev'))

    /**
         * Development-only error handler middleware.
         */

    app.use(errorHandler()) // Error handler - has to be last
  }
}

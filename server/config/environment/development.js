'use strict'

// Development specific configuration
// ==================================
module.exports = {

  // Server port
  port: 3022,

  // Secure Server port
  secure_port: 8442,

  domain: 'http://localhost:3022',

  // MongoDB connection options
  mongo: {
    uri: 'mongodb://localhost/kibochat-dev'
  },
  seedDB: false,
  facebook: {
    clientID: process.env.FACEBOOK_ID || '159385484629940',
    clientSecret: process.env.FACEBOOK_SECRET || '67527aa04570a034b6ff67335d95e91c',
    callbackURL: `${process.env.DOMAIN || 'https://kibopush-sojharo.ngrok.io'}/auth/facebook/callback`
  },

  webhook_ip: '127.0.0.1',
  DBLAYER_URL_KIBOCHAT: `http://localhost:3030/api/v1`,
  DBLAYER_URL_KIBOENGAGE: `http://localhost:3031/api/v1`,
  ACCOUNTS_URL: 'http://localhost:3024/api/v1',
  KIBOENGAGE_URL: 'http://localhost:3021/api/v1'
}

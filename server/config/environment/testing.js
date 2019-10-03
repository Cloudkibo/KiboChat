
'use strict'

// Development specific configuration
// ==================================
module.exports = {

  // Server port
  port: 3024,

  // Secure Server port
  secure_port: 8444,

  domain: `${process.env.DOMAIN || 'http://localhost:3024'}`,

  // MongoDB connection options
  mongo: {
    uri: 'mongodb://localhost/accounts-test'
  },
  seedDB: false,

  facebook: {
    clientID: process.env.FACEBOOK_ID || '159385484629940',
    clientSecret: process.env.FACEBOOK_SECRET || '67527aa04570a034b6ff67335d95e91c',
    callbackURL: `${process.env.DOMAIN || 'https://kibopush-sojharo.ngrok.io'}/auth/facebook/callback`
  },

  api_urls: {
    kibochat: `http://localhost:3030/api/v1`,
    kiboengage: `http://localhost:3031/api/v1`
  }
}

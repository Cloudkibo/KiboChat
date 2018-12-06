'use strict'

// Development specific configuration
// ==================================
module.exports = {
  // MongoDB connection options
  mongo: {
    uri: 'mongodb://localhost/kibochat-dev'
  },
  seedDB: false,
  facebook: {
    clientID: process.env.FACEBOOK_ID || '159385484629940',
    clientSecret: process.env.FACEBOOK_SECRET || '67527aa04570a034b6ff67335d95e91c',
    callbackURL: `${process.env.DOMAIN || 'https://kibopush-sojharo.ngrok.io'}/auth/facebook/callback`
  }
}

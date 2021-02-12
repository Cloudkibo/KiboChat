'use strict'

// Development specific configuration
// ==================================
module.exports = {

  // Server port
  port: process.env.PORT || 3000,

  // Secure Server port
  secure_port: process.env.SECURE_PORT || 8443,

  domain: `${process.env.DOMAIN || 'https://skibochat.cloudkibo.com'}`,

  // MongoDB connection options
  mongo: {
    uri: 'mongodb://localhost/kibochat-staging'
  },
  seedDB: false,
  facebook: {
    clientID: process.env.FACEBOOK_ID,
    clientSecret: process.env.FACEBOOK_SECRET,
    callbackURL: `${process.env.DOMAIN}/auth/facebook/callback`
  },
  api_urls: {
    webhook: 'https://swebhook.cloudkibo.com',
    accounts: 'https://saccounts.cloudkibo.com/api/v1',
    chat: 'https://skibochat.cloudkibo.com/api',
    kibochat: `${process.env.DB_LAYER_IP_KIBOCHAT}/api/v1`,
    kiboengage: `${process.env.DB_LAYER_IP_KIBOENGAGE}/api/v1`,
    kibodash: `${process.env.KIBODASH}/api/v1`
  },
  webhook_ip: process.env.WEBHOOK_IP_ADDRESS || 'localhost',
  DBLAYER_URL_KIBOCHAT: `${process.env.DB_LAYER_IP_KIBOCHAT}/api/v1`,
  DBLAYER_URL_KIBOENGAGE: `${process.env.DB_LAYER_IP_KIBOENGAGE}/api/v1`,
  ACCOUNTS_URL: 'https://saccounts.cloudkibo.com/api/v1',
  KIBOENGAGE_URL: 'https://skiboengage.cloudkibo.com/api',
  KIBOAUTOMATION_URL: 'https://kiboautomation.cloudkibo.com/api',
  accountsDomain: 'https://saccounts.cloudkibo.com',
  kibodash: `${process.env.KIBODASH}/api/v1`,
  zoomClientId: process.env.ZOOM_CLIENT_ID,
  zoomClientSecret: process.env.ZOOM_CLIENT_SECRET,
  zoomRedirectUri: process.env.ZOOM_REDIRECT_URI
}

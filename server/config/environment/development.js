'use strict'

// Development specific configuration
// ==================================
module.exports = {

  // Server port
  port: 3022,

  // Secure Server port
  secure_port: 8442,

  domain: `${process.env.DOMAIN || 'http://localhost:3022'}`,

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
  api_urls: {
    webhook: 'https://kibopush-anisha.ngrok.io',
    accounts: 'http://localhost:3024/api/v1',
    chat: 'http://localhost:3022/api',
    kibochat: `http://localhost:3030/api/v1`,
    kiboengage: `http://localhost:3031/api/v1`,
    kibodash: `http://localhost:5050/api/v1`
  },

  webhook_ip: 'https://kibopush-anisha.ngrok.io',
  DBLAYER_URL_KIBOCHAT: `http://localhost:3030/api/v1`,
  DBLAYER_URL_KIBOENGAGE: `http://localhost:3031/api/v1`,
  ACCOUNTS_URL: 'http://localhost:3024/api/v1',
  KIBOENGAGE_URL: 'http://localhost:3021/api',
  KIBOAUTOMATION_URL: 'http://localhost:3050/api',
  kibodash: `http://localhost:5050/api/v1`,
  accountsDomain: 'http://localhost:3024',
  COVIS: 'http://localhost:8080/api',
  zoomClientId: 'sVqps8gkQOeR91ls8j9ZIA',
  zoomClientSecret: 'ztyfVthdSe09OtTMO3Nl1dEtZXVdwVTN',
  zoomRedirectUri: 'https://kibopush-zoom.ngrok.io/auth/zoom/callback',
  papertrail_log_levels: ''
  // PLEASE DON'T DEFINE DIALOGFLOW OAUTH VARIABLES HERE. THEY ARE ALREADY DEFINED IN INDEX.JS
}

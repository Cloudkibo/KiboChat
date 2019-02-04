// Production specific configuration
// ==================================
module.exports = {

  // Server port
  port: process.env.PORT || 3000,

  // Secure Server port
  secure_port: process.env.SECURE_PORT || 8443,

  domain: `${process.env.DOMAIN || 'https://kibochat.cloudkibo.com'}`,

  // MongoDB connection options
  mongo: {
    uri: process.env.MONGO_URI || 'mongodb://localhost/kibochat-prod'
  },
  seedDB: false,
  facebook: {
    clientID: process.env.FACEBOOK_ID,
    clientSecret: process.env.FACEBOOK_SECRET,
    callbackURL: `${process.env.DOMAIN}/auth/facebook/callback`
  },

  webhook_ip: process.env.WEBHOOK_IP_ADDRESS || 'localhost',
  DBLAYER_URL_KIBOCHAT: `${process.env.DB_LAYER_IP_KIBOCHAT}/api/v1`,
  DBLAYER_URL_KIBOENGAGE: `${process.env.DB_LAYER_IP_KIBOENGAGE}/api/v1`,
  ACCOUNTS_URL: 'https://accounts.cloudkibo.com/api/v1',
  KIBOENGAGE_URL: 'https://kiboengage.cloudkibo.com/api'
}

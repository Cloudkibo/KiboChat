const path = require('path')
const _ = require('lodash')

const all = {
  env: process.env.NODE_ENV,

  secrets: {
    session: process.env.SESSION_SECRET || 'some string'
  },

  // Project root path
  root: path.normalize(`${__dirname}/../../..`),

  // Server port
  port: process.env.PORT || 3002,

  // Secure Server port
  secure_port: process.env.SECURE_PORT || 8445,

  ip: process.env.IP || undefined,

  userRoles: ['buyer', 'admin', 'supervisor', 'agent'],

  domain: `${process.env.DOMAIN || 'http://localhost:3000'}`,

  // Mongo Options
  mongo: {
    options: {
      db: {
        safe: true
      }
    }
  },
  allowedIps: ['::ffff:165.227.178.70', '::ffff:167.99.56.161', '::ffff:159.65.47.134', '::ffff:159.203.175.244', '::ffff:159.89.185.221', '::ffff:165.227.66.158', '::ffff:104.131.67.58', '::ffff:165.227.130.222'],
  webhook_ip: process.env.WEBHOOK_IP_ADDRESS || 'localhost',
  DBLAYER_URL_KIBOCHAT: process.env.NODE_ENV === 'production' ? 'https://dblayer-kibochat.cloudkibo.com/api/v1/' : process.env.NODE_ENV === 'staging' ? 'https://dblayer-skibochat.cloudkibo.com/api/v1/' : 'http://localhost:3000/api/v1/',
  DBLAYER_URL_KIBOENGAGE: process.env.NODE_ENV === 'production' ? 'https://dblayer-kiboengage.cloudkibo.com/api/v1/' : process.env.NODE_ENV === 'staging' ? 'https://dblayer-skiboengage.cloudkibo.com/api/v1/' : 'http://localhost:3000/api/v1/',
  ACCOUNTS_URL: process.env.NODE_ENV === 'production' ? 'https://accounts.cloudkibo.com/api/v1/' : process.env.NODE_ENV === 'staging' ? 'https://saccounts.cloudkibo.com/api/v1/' : 'http://localhost:3001/api/v1/',
  KIBOENGAGE_URL: process.env.NODE_ENV === 'production' ? 'https://kiboengage.cloudkibo.com/api/v1/' : process.env.NODE_ENV === 'staging' ? 'https://skiboengage.cloudkibo.com/api/' : 'http://localhost:3000/api/'
}

module.exports = _.merge(
  all,
  require(`./${process.env.NODE_ENV}.js`) || {})

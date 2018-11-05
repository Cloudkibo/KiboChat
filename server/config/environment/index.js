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
  port: process.env.PORT || 3000,

  // Secure Server port
  secure_port: process.env.SECURE_PORT || 8443,

  ip: process.env.IP || undefined,

  domain: `${process.env.DOMAIN || 'http://localhost:3000'}`,

  // Mongo Options
  mongo: {
    options: {
      db: {
        safe: true
      }
    }
  },
  webhook_ip: process.env.WEBHOOK_IP_ADDRESS || 'localhost',
  DBLAYER_URL_KIBOCHAT: process.env.NODE_ENV === 'production' ? 'https://dblayer-kibochat.cloudkibo.com/api/v1/' : process.env.NODE_ENV === 'staging' ? 'https://dblayer-skibochat.cloudkibo.com/api/v1/' : 'http://localhost:3000/api/v1/',
  DBLAYER_URL_KIBOENGAGE: process.env.NODE_ENV === 'production' ? 'https://dblayer-kiboengage.cloudkibo.com/api/v1/' : process.env.NODE_ENV === 'staging' ? 'https://dblayer-skiboengage.cloudkibo.com/api/v1/' : 'http://localhost:3000/api/v1/',
  ACCOUNTS_URL: process.env.NODE_ENV === 'production' ? 'https://accounts.cloudkibo.com/api/v1/' : process.env.NODE_ENV === 'staging' ? 'https://saccounts.cloudkibo.com/api/v1/' : 'http://localhost:3001/api/v1/',
  KIBOENGAGE_URL: process.env.NODE_ENV === 'production' ? 'https://kiboengage.cloudkibo.com/api/v1/' : process.env.NODE_ENV === 'staging' ? 'https://skiboengage.cloudkibo.com/api/' : 'http://localhost:3000/api/'
}

module.exports = _.merge(
  all,
  require(`./${process.env.NODE_ENV}.js`) || {})

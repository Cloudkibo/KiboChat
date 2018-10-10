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
  port: process.env.PORT || 8000,

  ip: process.env.IP || undefined,

  domain: `${process.env.DOMAIN || 'project domain'}`,

  // Mongo Options
  mongo: {
    options: {
      db: {
        safe: true
      }
    }
  },
  webhook_ip: process.env.WEBHOOK_IP_ADDRESS || 'localhost',
  API_URL_ACCOUNTS: process.env.NODE_ENV === 'production' ? 'https://accounts.cloudkibo.com/api/v1/' : process.env.NODE_ENV === 'staging' ? 'https://saccounts.cloudkibo.com/api/v1/' : 'http://localhost:3000/api/v1/'
}

module.exports = _.merge(
  all,
  require(`./${process.env.NODE_ENV}.js`) || {})

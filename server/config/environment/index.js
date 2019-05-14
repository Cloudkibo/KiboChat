const path = require('path')
const _ = require('lodash')

const all = {
  env: process.env.NODE_ENV,

  secrets: {
    session: process.env.SESSION_SECRET || 'some string'
  },

  // Project root path
  root: path.normalize(`${__dirname}/../../..`),

  ip: process.env.IP || undefined,

  userRoles: ['buyer', 'admin', 'supervisor', 'agent'],

  // Mongo Options
  mongo: {
    options: {
      db: {
        safe: true
      }
    }
  },
  allowedIps: ['::ffff:142.93.66.26', '::ffff:165.227.178.70', '::ffff:167.99.56.161', '::ffff:159.65.47.134', '::ffff:159.203.175.244', '::ffff:159.89.185.221', '::ffff:165.227.66.158', '::ffff:104.131.67.58', '::ffff:165.227.130.222', '::ffff:127.0.0.1'],
  kiboAPIIP: ['::ffff:142.93.66.26', '::ffff:127.0.0.1']
}

module.exports = _.merge(
  all,
  require(`./${process.env.NODE_ENV}.js`) || {})

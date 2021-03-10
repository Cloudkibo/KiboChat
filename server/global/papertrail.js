const config = require('../config/environment/index')
const winston = require('winston')

// eslint-disable-next-line no-unused-expressions
require('winston-papertrail').Papertrail

const logger = new winston.Logger({
  transports: [
    new winston.transports.Papertrail({
      host: 'logs3.papertrailapp.com',
      port: 45576,
      colorize: true,
      attemptsBeforeDecay: 1
    })
  ]
})

exports.sendLog = function (message, path, data, otherInfo, level) {
  if (config.papertrail_log_levels.split(',').indexOf(level) > -1) {
    const logData = JSON.stringify({path, message, data, otherInfo})
    logger.log(level, logData)
  }
}

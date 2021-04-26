const {callApi} = require('../../api/v1.1/utility')
const logger = require('../../components/logger')
const TAG = 'scripts/NotificationScript.js'

exports.resetUsage = function () {
  callApi(`featureUsage/updateCompany`, 'put', {
    query: {platform: 'sms'},
    newPayload: { messages: 0 },
    options: {multi: true}
  })
    .then(result => {
    })
    .catch(err => {
      const message = err || 'Failed to update companyUsages'
      logger.serverLog(message, `${TAG}: exports.resetUsage`, {}, {}, 'error')
    })
}

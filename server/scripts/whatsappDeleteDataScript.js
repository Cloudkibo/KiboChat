const utility = require('../api/v1.1/utility')
const logger = require('../components/logger')
const TAG = 'scripts/WhatsappDeleteData.js'

exports.runWhatspdeleteScript = function () {
  utility.callApi(`scripts/deleteWhatsappData`, 'get', {}, 'accounts')
    .then(response => {
    }).catch(error => {
      const message = error || 'Error while run runWhatspdeleteScript'
      logger.serverLog(message, `${TAG}: exports.runWhatspdeleteScript`, {}, {}, 'error')
    })
}

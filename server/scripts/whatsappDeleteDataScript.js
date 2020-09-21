const utility = require('../api/v1.1/utility')
const logger = require('../components/logger')
const TAG = 'scripts/WhatsappDeleteData.js'

exports.runWhatspdeleteScript = function () {
  utility.callApi(`scripts/deleteWhatsappData`, 'get', {}, 'accounts')
    .then(response => {
      logger.serverLog(TAG, `script run successfully`)
    }).catch(error => {
      logger.serverLog(TAG, `Error while run runWhatspdeleteScript ${error}`, 'error')
    })
}

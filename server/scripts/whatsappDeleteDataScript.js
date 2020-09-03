const utility = require('../api/v1.1/utility')
const logger = require('../components/logger')
const TAG = 'scripts/WhatsappDeleteData.js'

exports.runWhatspdeleteScript = function () {
  utility.callApi(`scripts/deleteWhatsappData`, 'get', {}, 'accounts')
    .then(response => {
      console.log('script run successfully')
    }).catch(error => {
      console.log(`script failed ${error}`)
      logger.serverLog(TAG, `Error while run runWhatspdeleteScript ${error}`, 'error')
    })}
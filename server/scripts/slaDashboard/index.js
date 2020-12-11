// const logger = require('../components/logger')
// const TAG = 'scripts/slaDashboard.js'
// const { callApi } = require('../api/v1.1/utility')
const { pushDayWiseRecordsToSDAPage } = require('./SDAPageWise')
const { pushDayWiseRecordsToSDAUser } = require('./SDAUserWise')

exports.slaDashboardScript = function () {
  const last24 = new Date(Date.now() - (24 * 60 * 60 * 1000))
  pushDayWiseRecordsToSDAPage(last24)
  pushDayWiseRecordsToSDAUser(last24)
}

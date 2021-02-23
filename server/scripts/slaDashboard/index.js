const { pushDayWiseRecordsToSDAPage } = require('./SDAPageWise')
const { pushDayWiseRecordsToSDAUser } = require('./SDAUserWise')
const { pushDayWiseRecordsToSDATeam } = require('./SDATeamWise')

exports.slaDashboardScript = function () {
  const last24 = new Date(Date.now() - (24 * 60 * 60 * 1000))
  pushDayWiseRecordsToSDAPage(last24)
  pushDayWiseRecordsToSDAUser(last24)
  pushDayWiseRecordsToSDATeam(last24)
}

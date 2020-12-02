const ogs = require('open-graph-scraper')
const logger = require('../../components/logger')
const TAG = 'api/global/utility.js'

const openGraphScrapper = function (url) {
  let options = {url}
  return new Promise((resolve, reject) => {
    ogs(options, (error, results) => {
      if (error) {
        const message = error || 'unable fetch url open graph info'
        logger.serverLog(message, `${TAG}: exports.checkSMPStatus`, {}, {url}, 'error')
        reject(results.error)
      } else {
        resolve(results.data)
      }
    })
  })
}

const getTimeDiffInMinutes = function (startDate, endDate) {
  const diff = endDate.getTime() - startDate.getTime()
  return (diff / 60000)
}

exports.openGraphScrapper = openGraphScrapper
exports.getTimeDiffInMinutes = getTimeDiffInMinutes

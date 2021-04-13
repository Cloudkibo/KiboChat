const ogs = require('open-graph-scraper')
const config = require('../../config/environment/index')
const logger = require('../../components/logger')
const TAG = 'api/global/utility.js'

const openGraphScrapper = function (url) {
  return new Promise((resolve, reject) => {
    let redirectUrl = ''
    try {
      const urlData = new URL(url)
      if (config.domain.includes(urlData.host)) {
        if (urlData.search) {
          const query = 'url='
          let queryIndex = urlData.search.indexOf(query)
          if (queryIndex > -1) {
            queryIndex += query.length
            redirectUrl = urlData.search.substring(queryIndex)
          }
        } else {
          redirectUrl = 'https://kibopush.com'
        }
      }
    } catch (err) {
      const message = err || 'invalid url'
      logger.serverLog(message, `${TAG}: openGraphScrapper`, {}, {url}, 'error')
      reject(err)
    }
    let options = {url: redirectUrl || url, timeout: 10000, retry: 3}
    ogs(options, (error, results) => {
      if (error) {
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

const isEmail = function (email) {
  // eslint-disable-next-line no-useless-escape
  var re = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/
  return re.test(String(email).toLowerCase())
}

const isPhoneNumber = function (str) {
  var regexp = /^[\+]?[(]?[0-9]{3}[)]?[-\s\.]?[0-9]{3}[-\s\.]?[0-9]{4,6}$/im
  return regexp.test(str)
}

const containsURL = function (text) {
  /* eslint-disable */
  var urlRegex = /(\b(https?|ftp|file):\/\/[-A-Z0-9+&@#\/%?=~_|!:,.;]*[-A-Z0-9+&@#\/%=~_|])/ig
  /* eslint-enable */
  return text.match(urlRegex)
}

exports.getSuperWhatsAppAccount = () => {
  return {
    provider: 'flockSend',
    accessToken: '5ef497d3f5ced46d5016a442',
    businessNumber: '+14256266670'
  }
}

exports.convertTimeZone = (date, tzString) => {
  return new Date((typeof date === 'string' ? new Date(date) : date).toLocaleString('en-US', {timeZone: tzString}))
}

exports.openGraphScrapper = openGraphScrapper
exports.getTimeDiffInMinutes = getTimeDiffInMinutes
exports.isEmail = isEmail
exports.isPhoneNumber = isPhoneNumber
exports.containsURL = containsURL

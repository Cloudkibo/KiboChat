const ogs = require('open-graph-scraper')
const logger = require('../../components/logger')
const TAG = 'api/global/utility.js'

const openGraphScrapper = function (url) {
  let options = {url}
  return new Promise((resolve, reject) => {
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

exports.openGraphScrapper = openGraphScrapper
exports.getTimeDiffInMinutes = getTimeDiffInMinutes
exports.isEmail = isEmail
exports.isPhoneNumber = isPhoneNumber

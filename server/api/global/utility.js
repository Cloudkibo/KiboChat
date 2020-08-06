const ogs = require('open-graph-scraper')

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

exports.openGraphScrapper = openGraphScrapper

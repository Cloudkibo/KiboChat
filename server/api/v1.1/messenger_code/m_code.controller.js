const logger = require('../../../components/logger')
const TAG = 'api/menu/menu.controller.js'
const callApi = require('../utility')

const util = require('util')

exports.index = function (req, res) {
  logger.serverLog(TAG, `Going to call accounts for code ${util.inspect(req.body)}`)
  callApi.callApi('messenger_code', 'post', req.body, req.headers.authorization)
    .then(codeUrl => {
      logger.serverLog(TAG, `Got the following URL ${util.inspect(codeUrl)}`)
      return res.status(200).json({status: 'success', payload: codeUrl})
    })
    .catch(err => {
      return res.status(500).json({
        status: 'failed',
        description: `Internal Server Error ${JSON.stringify(err)}`
      })
    })
}

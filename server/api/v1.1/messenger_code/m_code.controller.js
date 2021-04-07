const logger = require('../../../components/logger')
const TAG = 'api/menu/menu.controller.js'
const callApi = require('../utility')
const { sendSuccessResponse, sendErrorResponse } = require('../../global/response')

exports.index = function (req, res) {
  callApi.callApi('messenger_code', 'post', req.body)
    .then(codeUrl => {
      sendSuccessResponse(res, 200, codeUrl)
    })
    .catch(err => {
      const message = err || 'error in creating messenger code'
      logger.serverLog(message, `${TAG}: exports.index`, req.body, {user: req.user}, 'error')
      sendErrorResponse(res, 500, '', `Internal Server Error ${JSON.stringify(err)}`)
    })
}

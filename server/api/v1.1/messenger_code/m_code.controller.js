const logger = require('../../../components/logger')
const TAG = 'api/menu/menu.controller.js'
const callApi = require('../utility')
const { sendSuccessResponse, sendErrorResponse } = require('../../global/response')
const util = require('util')

exports.index = function (req, res) {
  callApi.callApi('messenger_code', 'post', req.body)
    .then(codeUrl => {
      sendSuccessResponse(res, 200, codeUrl)
    })
    .catch(err => {
      sendErrorResponse(res, 500, '', `Internal Server Error ${JSON.stringify(err)}`)
    })
}

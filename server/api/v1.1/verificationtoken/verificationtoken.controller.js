
// Get a single verificationtoken
const utility = require('../utility')
// const logger = require('../../../components/logger')
// const TAG = 'api/v2/user/user.controller.js'
const { sendErrorResponse, sendSuccessResponse } = require('../../global/response')

exports.resend = function (req, res) {
  utility.callApi(`verificationtoken/resend`, 'get', {}, 'accounts', req.headers.authorization)
    .then(response => {
      sendSuccessResponse(res, 200, response)
    })
    .catch(err => { sendErrorResponse(res, 500, 'Internal Server Error ' + err) })
}

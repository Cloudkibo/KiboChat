const LogicLayer = require('./logiclayer')
const utility = require('../utility')
const { sendErrorResponse, sendSuccessResponse } = require('../../global/response')

exports.actingAsUser = function (req, res) {
  let updated = LogicLayer.getActingAsUserPayload(req.body)
  utility.callApi('user/update', 'post', {query: {_id: req.user._id}, newPayload: updated, options: {}})
    .then(updated => {
      sendSuccessResponse(res, 200, updated)
    })
    .catch(err => {
      sendErrorResponse(res, 500, err)
    })
}

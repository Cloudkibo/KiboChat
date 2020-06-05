
const { sendSuccessResponse, sendErrorResponse } = require('../../global/response')
const utility = require('../../v1.1/utility')
exports.update = function (req, res) {
  utility.callApi(`companyUser/update`, 'put', {query: {userId: req.user._id}, newPayload: req.body.updatedObject, options: {}})
    .then(updatedcompanyUser => {
      sendSuccessResponse(res, 200, updatedcompanyUser)
    })
    .catch(err => {
      sendErrorResponse(res, 500, `Failed to update companyUser ${err}`)
    })
}
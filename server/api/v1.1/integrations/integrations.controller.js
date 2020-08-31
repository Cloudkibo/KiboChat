const { sendErrorResponse, sendSuccessResponse } = require('../../global/response')
const { callApi } = require('../utility')

exports.index = function (req, res) {
  callApi(`integrations/query`, 'post', {companyId: req.user.companyId}, 'accounts', req.headers.authorization)
    .then(integrations => {
      sendSuccessResponse(res, 200, integrations)
    })
    .catch(err => {
      sendErrorResponse(res, 500, '', `Failed to fetch integrations ${err}`)
    })
}
exports.update = function (req, res) {
  callApi(`integrations/update`, 'put', {query: {_id: req.params.id}, newPayload: req.body, options: {}}, 'accounts', req.headers.authorization)
    .then(integrations => {
      sendSuccessResponse(res, 200, integrations)
    })
    .catch(err => {
      sendErrorResponse(res, 500, '', `Failed to update integration ${err}`)
    })
}

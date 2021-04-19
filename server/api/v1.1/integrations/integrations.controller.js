const { sendErrorResponse, sendSuccessResponse } = require('../../global/response')
const { callApi } = require('../utility')
const logger = require('../../../components/logger')
const TAG = '/api/v1.1/integrations/integrations.controller.js'
const { updateCompanyUsage } = require('../../global/billingPricing')

exports.index = function (req, res) {
  callApi(`integrations/query`, 'post', {companyId: req.user.companyId}, 'accounts', req.headers.authorization)
    .then(integrations => {
      sendSuccessResponse(res, 200, integrations)
    })
    .catch(err => {
      const message = err || 'Failed to fetch integrations'
      logger.serverLog(message, `${TAG}: exports.index`, {}, {user: req.user}, 'error')
      sendErrorResponse(res, 500, '', `Failed to fetch integrations ${err}`)
    })
}
exports.update = function (req, res) {
  callApi(`integrations/update`, 'put', {query: {_id: req.params.id}, newPayload: req.body, options: {}}, 'accounts', req.headers.authorization)
    .then(integrations => {
      if (!req.body.enabled) {
        updateCompanyUsage(req.user.companyId, 'external_integrations', -1)
      }
      sendSuccessResponse(res, 200, integrations)
    })
    .catch(err => {
      const message = err || 'Failed to update integration'
      logger.serverLog(message, `${TAG}: exports.update`, {}, {user: req.user}, 'error')
      sendErrorResponse(res, 500, '', `Failed to update integration ${err}`)
    })
}

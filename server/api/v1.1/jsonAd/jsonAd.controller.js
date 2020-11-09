const logger = require('../../../components/logger')
const TAG = '/api/v1.1/jsonAd/jsonAd.controller.js'
const { sendSuccessResponse, sendErrorResponse } = require('../../global/response')
const { callApi } = require('../utility')

exports.create = function (req, res) {
  callApi(`jsonAd/create`, 'post', req.body)
    .then(jsonAd => {
      sendSuccessResponse(res, 200, jsonAd)
    })
    .catch(err => {
      sendErrorResponse(res, 500, `Failed to create json Ad ${err}`)
    })
}

exports.edit = function (req, res) {
  callApi(`jsonAd/edit`, 'post', req.body)
    .then(jsonAd => {
      sendSuccessResponse(res, 200, jsonAd)
    })
    .catch(err => {
      sendErrorResponse(res, 500, `Failed to edit json Ad ${err}`)
    })
}

exports.getAll = function (req, res) {
  callApi(`companyUser/query`, 'post', { domain_email: req.user.domain_email })
    .then(companyUser => {
      if (!companyUser) {
        sendErrorResponse(res, 404, '', 'The user account does not belong to any company. Please contact support')
      }
      callApi(`jsonAd/query`, 'post', {companyId: companyUser.companyId})
        .then(jsonAds => {
          sendSuccessResponse(res, 200, jsonAds)
        })
        .catch(err => {
          sendErrorResponse(res, 500, `Failed to fetch json Ads ${err}`)
        })
    })
    .catch(error => {
      sendErrorResponse(res, 500, `Failed to fetch company user ${JSON.stringify(error)}`)
    })
}

exports.getOne = function (req, res) {
  callApi(`jsonAd/${req.params.id}`, 'get', {})
    .then(jsonAd => {
      sendSuccessResponse(res, 200, jsonAd)
    })
    .catch(err => {
      sendErrorResponse(res, 500, `Failed to fetch json Ad ${err}`)
    })
}

exports.deleteOne = function (req, res) {
  callApi(`jsonAd/delete/${req.params.id}`, 'delete', {})
    .then(jsonAd => {
      sendSuccessResponse(res, 200, jsonAd)
    })
    .catch(err => {
      sendErrorResponse(res, 500, `Failed to fetch json Ad ${err}`)
    })
}

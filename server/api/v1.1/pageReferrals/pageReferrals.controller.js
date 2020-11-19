const utility = require('../utility')
const logicLayer = require('./pageReferrals.logiclayer')
const { sendSuccessResponse, sendErrorResponse } = require('../../global/response')
const logger = require('../../../components/logger')
const TAG = 'api/v1/notifications/notifications.utility.js'

exports.index = function (req, res) {
  utility.callApi(`companyUser/query`, 'post', { domain_email: req.user.domain_email })
    .then(companyUser => {
      if (!companyUser) {
        sendErrorResponse(res, 404, '', 'The user account does not belong to any company. Please contact support')
      }
      utility.callApi(`pageReferrals/query`, 'post', {companyId: companyUser.companyId})
        .then(pageReferrals => {
          sendSuccessResponse(res, 200, pageReferrals)
        })
        .catch(error => {
          const message = error || 'Failed to fetch pageReferrals'
          logger.serverLog(message, `${TAG}: exports.index`, {}, {user: req.user}, 'error')
          sendErrorResponse(res, 500, `Failed to fetch pageReferrals ${JSON.stringify(error)}`)
        })
    })
    .catch(error => {
      const message = error || 'Failed to fetch company user'
      logger.serverLog(message, `${TAG}: exports.index`, {}, {user: req.user}, 'error')
      sendErrorResponse(res, 500, `Failed to fetch company user ${JSON.stringify(error)}`)
    })
}
exports.view = function (req, res) {
  utility.callApi(`pageReferrals/query`, 'post', {_id: req.params.id, companyId: req.user.companyId})
    .then(pageReferrals => {
      sendSuccessResponse(res, 200, pageReferrals[0])
    })
    .catch(error => {
      const message = error || 'Failed to fetch pageReferral'
      logger.serverLog(message, `${TAG}: exports.view`, {}, {user: req.user, params: req.params}, 'error')
      sendErrorResponse(res, 500, `Failed to fetch pageReferral ${JSON.stringify(error)}`)
    })
}
exports.delete = function (req, res) {
  utility.callApi(`pageReferrals/${req.params.id}`, 'delete', {})
    .then(result => {
      sendSuccessResponse(res, 200, result)
    })
    .catch(error => {
      const message = error || 'Failed to delete pageReferral'
      logger.serverLog(message, `${TAG}: exports.delete`, {}, {user: req.user, params: req.params}, 'error')
      sendErrorResponse(res, 500, `Failed to delete pageReferral ${JSON.stringify(error)}`)
    })
}
exports.create = function (req, res) {
  utility.callApi(`companyUser/query`, 'post', { domain_email: req.user.domain_email })
    .then(companyUser => {
      if (!companyUser) {
        sendErrorResponse(res, 404, '', 'The user account does not belong to any company. Please contact support')
      }
      utility.callApi(`pageReferrals/query`, 'post', {pageId: req.body.pageId, companyId: companyUser.companyId})
        .then(pageReferrals => {
          if (pageReferrals && pageReferrals.length > 0) {
            isUnique(pageReferrals, req.body.ref_parameter)
              .then(result => {
                if (!result.isUnique) {
                  sendErrorResponse(res, 500, 'Please choose a unique Ref Parameter')
                } else {
                  utility.callApi(`pageReferrals`, 'post', logicLayer.createPayload('companyUser', req.body))
                    .then(craetedPageReferral => {
                      sendSuccessResponse(res, 200, craetedPageReferral)
                    })
                    .catch(error => {
                      const message = error || 'Failed to create pageReferral'
                      logger.serverLog(message, `${TAG}: exports.create`, req.body, {user: req.user, params: req.params}, 'error')
                      sendErrorResponse(res, 500, `Failed to create pageReferral ${JSON.stringify(error)}`)
                    })
                }
              })
          } else {
            utility.callApi(`pageReferrals`, 'post', logicLayer.createPayload(companyUser, req.body))
              .then(craetedPageReferral => {
                sendSuccessResponse(res, 200, craetedPageReferral)
              })
              .catch(error => {
                const message = error || 'Failed to create pageReferral'
                logger.serverLog(message, `${TAG}: exports.create`, req.body, {user: req.user, params: req.params}, 'error')
                sendErrorResponse(res, 500, `Failed to create pageReferral ${JSON.stringify(error)}`)
              })
          }
        })
        .catch(error => {
          const message = error || 'Failed to fetch pageReferral'
          logger.serverLog(message, `${TAG}: exports.create`, req.body, {user: req.user, params: req.params}, 'error')
          sendErrorResponse(res, 500, `Failed to fetch pageReferrals ${JSON.stringify(error)}`)
        })
    })
    .catch(error => {
      const message = error || 'Failed to fetch company user'
      logger.serverLog(message, `${TAG}: exports.create`, req.body, {user: req.user, params: req.params}, 'error')
      sendErrorResponse(res, 500, `Failed to fetch company user ${JSON.stringify(error)}`)
    })
}
exports.update = function (req, res) {
  utility.callApi(`companyUser/query`, 'post', { domain_email: req.user.domain_email })
    .then(companyUser => {
      if (!companyUser) {
        sendErrorResponse(res, 404, '', 'The user account does not belong to any company. Please contact support')
      }
      utility.callApi(`pageReferrals/query`, 'post', {_id: req.body._id, companyId: companyUser.companyId})
        .then(pageReferrals => {
          if (pageReferrals.length > 0 && req.body.ref_parameter) {
            isUniqueEdit(pageReferrals, req.body.ref_parameter)
              .then(result => {
                if (!result.isUnique) {
                  sendErrorResponse(res, 500, 'Please choose a unique Ref Parameter')
                } else {
                  utility.callApi(`pageReferrals/${req.body._id}`, 'put', req.body)
                    .then(updatedPageReferral => {
                      sendSuccessResponse(res, 200, updatedPageReferral)
                    })
                    .catch(error => {
                      const message = error || 'Failed to update pageReferral'
                      logger.serverLog(message, `${TAG}: exports.update`, req.body, {user: req.user}, 'error')
                      sendErrorResponse(res, 500, `Failed to update pageReferral ${JSON.stringify(error)}`)
                    })
                }
              })
          } else {
            utility.callApi(`pageReferrals/${req.body._id}`, 'put', req.body)
              .then(updatedPageReferral => {
                sendSuccessResponse(res, 200, updatedPageReferral)
              })
              .catch(error => {
                const message = error || 'Failed to update pageReferral'
                logger.serverLog(message, `${TAG}: exports.update`, req.body, {user: req.user}, 'error')
                sendErrorResponse(res, 500, `Failed to update pageReferral ${JSON.stringify(error)}`)
              })
          }
        })
        .catch(error => {
          const message = error || 'Failed to fetch pageReferral'
          logger.serverLog(message, `${TAG}: exports.update`, req.body, {user: req.user}, 'error')
          sendErrorResponse(res, 500, `Failed to fetch pageReferrals ${JSON.stringify(error)}`)
        })
    })
    .catch(error => {
      const message = error || 'Failed to fetch company user'
      logger.serverLog(message, `${TAG}: exports.update`, req.body, {user: req.user}, 'error')
      sendErrorResponse(res, 500, `Failed to fetch company user ${JSON.stringify(error)}`)
    })
}
function isUnique (pageReferrals, refParameter) {
  let isUnique = true
  return new Promise(function (resolve, reject) {
    for (let i = 0; i < pageReferrals.length; i++) {
      if (pageReferrals[i].ref_parameter === refParameter) {
        isUnique = false
      }
      if (i === pageReferrals.length - 1) {
        resolve({isUnique: isUnique})
      }
    }
  })
}
function isUniqueEdit (pageReferrals, body) {
  let isUnique = true
  return new Promise(function (resolve, reject) {
    for (let i = 0; i < pageReferrals.length; i++) {
      if (pageReferrals[i].ref_parameter === body.ref_parameter && pageReferrals[i].pageId !== body.pageId) {
        isUnique = false
      }
      if (i === pageReferrals.length - 1) {
        resolve({isUnique: isUnique})
      }
    }
  })
}

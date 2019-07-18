const utility = require('../utility')
const logicLayer = require('./pageReferrals.logiclayer')
const { sendSuccessResponse, sendErrorResponse } = require('../../global/response')

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
          sendErrorResponse(res, 500, `Failed to fetch pageReferrals ${JSON.stringify(error)}`)
        })
    })
    .catch(error => {
      sendErrorResponse(res, 500, `Failed to fetch company user ${JSON.stringify(error)}`)
    })
}
exports.view = function (req, res) {
  utility.callApi(`pageReferrals/query`, 'post', {_id: req.params.id, companyId: req.user.companyId})
    .then(pageReferrals => {
      sendSuccessResponse(res, 200, pageReferrals[0])
    })
    .catch(error => {
      sendErrorResponse(res, 500, `Failed to fetch pageReferral ${JSON.stringify(error)}`)
    })
}
exports.delete = function (req, res) {
  utility.callApi(`pageReferrals/${req.params.id}`, 'delete', {})
    .then(result => {
      sendSuccessResponse(res, 200, result)
    })
    .catch(error => {
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
                sendErrorResponse(res, 500, `Failed to create pageReferral ${JSON.stringify(error)}`)
              })
          }
        })
        .catch(error => {
          sendErrorResponse(res, 500, `Failed to fetch pageReferrals ${JSON.stringify(error)}`)
        })
    })
    .catch(error => {
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
                sendErrorResponse(res, 500, `Failed to update pageReferral ${JSON.stringify(error)}`)
              })
          }
        })
        .catch(error => {
          sendErrorResponse(res, 500, `Failed to fetch pageReferrals ${JSON.stringify(error)}`)
        })
    })
    .catch(error => {
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

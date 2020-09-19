const LogicLayer = require('./logiclayer')
const utility = require('../utility')
const { sendErrorResponse, sendSuccessResponse } = require('../../global/response')

exports.actingAsUser = function (req, res) {
  utility.callApi('companyUser/query', 'post',  {domain_email: req.body.domain_email})
    .then(actingCompanyUser => {
      utility.callApi(`companyProfile/query`, 'post', {_id: actingCompanyUser.companyId})
      .then(actingCompanyProfile => {
        utility.callApi(`user/query`, 'post', {domain_email: req.body.domain_email})
        .then(actingUser => {
          actingUser = actingUser[0]
          let platforms = []
          if (actingUser.connectFacebook) {
            platforms.push('messenger')
          }
          if (actingCompanyProfile.twilio) {
            platforms.push('sms')
          }
          if (actingCompanyProfile.whatsApp) {
            platforms.push('whatsApp')
          }
          let updated = LogicLayer.getActingAsUserPayload(req, actingUser, platforms)
          utility.callApi('user/update', 'post', {query: {_id: req.user._id}, newPayload: updated, options: {}})
            .then(updated => {
              sendSuccessResponse(res, 200, updated)
            })
            .catch(err => {
              sendErrorResponse(res, 500, `Unable to Update user ${err}`)
            })
        })
        .catch(
          err => {
          sendErrorResponse(res, 500, `Unable to get user ${err}`)
        })
      })
      .catch(err => {
        sendErrorResponse(res, 500,  `Unable to get company profile ${err}`)
      })
    })
    .catch(err => {
      sendErrorResponse(res, 500,  `Unable to get company user ${err}`)
    })
}

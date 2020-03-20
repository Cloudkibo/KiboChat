const logger = require('../../../components/logger')
const TAG = 'api/v1/companyprofile/company.controller.js'
const utility = require('../utility')
const config = require('../../../config/environment/index')
const needle = require('needle')
const logicLayer = require('./company.logiclayer.js')
const { sendSuccessResponse, sendErrorResponse } = require('../../global/response')

exports.members = function (req, res) {
  utility.callApi(`companyprofile/members`, 'get', {}, 'accounts', req.headers.authorization)
    .then(members => {
      res.status(200).json({status: 'success', payload: members})
    })
    .catch(err => {
      res.status(500).json({status: 'failed', payload: `Failed to fetch members ${err}`})
    })
}
exports.getAutomatedOptions = function (req, res) {
  utility.callApi(`companyprofile/getAutomatedOptions`, 'get', {}, 'accounts', req.headers.authorization)
    .then(payload => {
      res.status(200).json({status: 'success', payload: payload})
    })
    .catch(err => {
      res.status(500).json({status: 'failed', payload: `Failed to fetch automated options ${err}`})
    })
}

exports.getAdvancedSettings = function (req, res) {
  utility.callApi(`companyprofile`, 'get', {}, 'accounts', req.headers.authorization)
    .then(payload => {
      res.status(200).json({status: 'success', payload: payload})
    })
    .catch(err => {
      res.status(500).json({status: 'failed', payload: `Failed to fetch advanced settings in company profile  ${err}`})
    })
}


exports.updateAdvancedSettings = function (req, res) {
  utility.callApi(`companyUser/query`, 'post', {domain_email: req.user.domain_email}) // fetch company user
    .then(companyUser => {
      if (!companyUser) {
        res.status(404).json({status: 'failed', payload: `The user account does not belong to any company. Please contact support`})
      }
      utility.callApi(`companyprofile/update`, 'put', {query: {_id: companyUser.companyId}, newPayload: req.body.updatedObject, options: {}})
        .then(updatedProfile => {
          res.status(200).json({status: 'success', payload: updatedProfile})
        })
        .catch(err => {
          res.status(500).json({status: 'failed', payload: `Failed to update company profile ${err}`})
        })
    })
    .catch(error => {
      res.status(500).json({status: 'failed', payload: `Failed to fetch company profile  ${error}`})
    })
}
exports.invite = function (req, res) {
  logger.serverLog(TAG, `invite request ${JSON.stringify(req.body)}`)
  utility.callApi('companyprofile/invite', 'post', {email: req.body.email, name: req.body.name, role: req.body.role}, 'accounts', req.headers.authorization)
    .then((result) => {
      logger.serverLog(TAG, `invite result ${result}`)
      res.status(200).json({status: 'success', payload: result})
    })
    .catch((err) => {
      logger.serverLog(TAG, `invite err.status ${err.error.status}`)
      logger.serverLog(TAG, `invite err.payload ${err.error.payload}`)
      res.status(500).json({status: `failed ${JSON.stringify(err)}`, payload: err.error.payload})
    })
}
exports.updateAutomatedOptions = function (req, res) {
  utility.callApi(`companyUser/query`, 'post', {domain_email: req.user.domain_email}) // fetch company user
    .then(companyUser => {
      if (!companyUser) {
        return res.status(404).json({
          status: 'failed',
          description: 'The user account does not belong to any company. Please contact support'
        })
      }
      utility.callApi(`companyprofile/update`, 'put', {query: {_id: companyUser.companyId}, newPayload: {automated_options: req.body.automated_options}, options: {}})
        .then(updatedProfile => {
          return res.status(200).json({status: 'success', payload: updatedProfile})
        })
        .catch(err => {
          res.status(500).json({status: 'failed', payload: `Failed to update company profile ${err}`})
        })
    })
    .catch(error => {
      return res.status(500).json({status: 'failed', payload: `Failed to company user ${JSON.stringify(error)}`
      })
    })
}
exports.updatePlatform = function (req, res) {
  utility.callApi(`companyUser/query`, 'post', {domain_email: req.user.domain_email}) // fetch company user
    .then(companyUser => {
      if (!companyUser) {
        sendErrorResponse(res, 404, '', 'The user account does not belong to any company. Please contact support')
      }
      needle.get(
        `https://${req.body.twilio.accountSID}:${req.body.twilio.authToken}@api.twilio.com/2010-04-01/Accounts`,
        (err, resp) => {
          if (err) {
            sendErrorResponse(res, 401, '', 'unable to authenticate twilio account')
          }
          console.log('response in company', resp)
          if (resp.statusCode === 200) {
            let accountSid = req.body.twilio.accountSID
            let authToken = req.body.twilio.authToken
            let client = require('twilio')(accountSid, authToken)
            client.incomingPhoneNumbers
              .list().then((incomingPhoneNumbers) => {
                console.log('incomingPhoneNumbers', incomingPhoneNumbers)
                if (incomingPhoneNumbers && incomingPhoneNumbers.length > 0) {
                  utility.callApi(`companyprofile/update`, 'put', {query: {_id: companyUser.companyId}, newPayload: {twilio: {accountSID: req.body.twilio.accountSID, authToken: req.body.twilio.authToken}}, options: {}})
                    .then(updatedProfile => {
                      sendSuccessResponse(res, 200, updatedProfile)
                      if (req.body.twilio.platform) {
                        utility.callApi('user/update', 'post', {query: {_id: req.user._id}, newPayload: {platform: req.body.twilio.platform}, options: {}})
                          .then(updated => {
                          })
                          .catch(err => {
                            sendErrorResponse(res, 500, '', err)
                          })
                      }
                    })
                    .catch(err => {
                      sendErrorResponse(res, 500, '', `Failed to update company profile ${err}`)
                    })
                  for (let i = 0; i < incomingPhoneNumbers.length; i++) {
                    client.incomingPhoneNumbers(incomingPhoneNumbers[i].sid)
                      .update({
                        accountSid: req.body.twilio.accountSID,
                        smsUrl: `${config.api_urls['webhook']}/webhooks/twilio/receiveSms`
                      })
                      .then(result => {
                      })
                  }
                } else {
                  sendErrorResponse(res, 500, '', 'The twilio account doesnot have any twilio number')
                }
              })
          } else {
            sendErrorResponse(res, 404, '', 'Twilio account not found. Please enter correct details')
          }
        })
    })
    .catch(error => {
      sendErrorResponse(res, 500, `Failed to company user ${JSON.stringify(error)}`)
    })
}
exports.updatePlatformWhatsApp = function (req, res) {
  utility.callApi(`companyUser/query`, 'post', {domain_email: req.user.domain_email}) // fetch company user
    .then(companyUser => {
      if (!companyUser) {
        return res.status(404).json({
          status: 'failed',
          description: 'The user account does not belong to any company. Please contact support'
        })
      }
      needle.get(
        `https://${req.body.accountSID}:${req.body.authToken}@api.twilio.com/2010-04-01/Accounts`,
        (err, resp) => {
          if (err) {
            return res.status(500).json({
              status: 'failed',
              description: 'unable to authenticate twilio account'
            })
          }
          if (resp.statusCode === 200) {
            let newPayload = {twilioWhatsApp: {
              accountSID: req.body.accountSID,
              authToken: req.body.authToken,
              sandboxNumber: req.body.sandboxNumber.split(' ').join(''),
              sandboxCode: req.body.sandboxCode
            }}
            utility.callApi(`companyprofile/update`, 'put', {query: {_id: companyUser.companyId}, newPayload: newPayload, options: {}})
              .then(updatedProfile => {
                if (req.body.platform) {
                  utility.callApi('user/update', 'post', {query: {_id: req.user._id}, newPayload: {platform: req.body.platform}, options: {}})
                    .then(updated => {
                    })
                    .catch(err => {
                      res.status(500).json({status: 'failed', payload: err})
                    })
                }
                return res.status(200).json({status: 'success', payload: updatedProfile})
              })
              .catch(err => {
                res.status(500).json({status: 'failed', payload: `Failed to update company profile ${err}`})
              })
          } else {
            return res.status(500).json({
              status: 'failed',
              description: 'Twilio account not found. Please enter correct details'
            })
          }
        })
    })
    .catch(error => {
      return res.status(500).json({status: 'failed', payload: `Failed to company user ${JSON.stringify(error)}`
      })
    })
}
exports.disconnect = function (req, res) {
  utility.callApi(`companyUser/query`, 'post', {domain_email: req.user.domain_email}) // fetch company user
    .then(companyUser => {
      if (!companyUser) {
        return res.status(404).json({
          status: 'failed',
          description: 'The user account does not belong to any company. Please contact support'
        })
      }
      let updated = {}
      if (req.body.type === 'sms') {
        updated = {$unset: {twilio: 1}}
      } else {
        updated = {$unset: {twilioWhatsApp: 1}}
      }
      let userUpdated = logicLayer.getPlatform(companyUser, req.body)
      utility.callApi(`companyprofile/update`, 'put', {query: {_id: companyUser.companyId}, newPayload: updated, options: {}})
        .then(updatedProfile => {
          utility.callApi('user/update', 'post', {query: {_id: req.user._id}, newPayload: userUpdated, options: {}})
            .then(updated => {
              return res.status(200).json({status: 'success', payload: updatedProfile})
            })
            .catch(err => {
              res.status(500).json({status: 'failed', payload: err})
            })
          return res.status(200).json({status: 'success', payload: updatedProfile})
        })
        .catch(err => {
          res.status(500).json({status: 'failed', payload: `Failed to update company profile ${err}`})
        })
    })
    .catch(error => {
      return res.status(500).json({status: 'failed', payload: `Failed to company user ${JSON.stringify(error)}`
      })
    })
}

exports.fetchValidCallerIds = function(req, res) {
  let accountSid = req.body.twilio.accountSID
  let authToken = req.body.twilio.authToken
  let client = require('twilio')(accountSid, authToken)
  client.outgoingCallerIds.list()
  .then((callerIds) => {
    if (callerIds && callerIds.length > 0 ) {
      callerIds.forEach((callerId, index) => {
        var contact = {
          name: callerId.friendlyName, 
          number: callerId.phoneNumber,
          companyId: req.user.companyId
        }
        utility.callApi(`contacts/query`, 'post', {
          number: callerId.phoneNumber, companyId: req.user.companyId})
          .then(phone => {
            if (phone.length === 0) {
              utility.callApi(`contacts`, 'post', contact)
                .then(saved => {
                  logger.serverLog(TAG, `${JSON.stringify(contact)} saved successfully`, 'success')
                })
                .catch(error => {
                  logger.serverLog(TAG, `Failed to save contact ${JSON.stringify(error)}`, 'error')
                })
            }
            if (index === (callerIds.length - 1)) {
              res.status(200).json({status: 'success', payload: 'Contacts updated successfully'})
            } 
          })
          .catch(error => {
            logger.serverLog(TAG, `Failed to fetch contact ${JSON.stringify(error)}`, 'error')
          })
      })
    }
  })
  .catch(error => {
    res.status(500).json({status: 'failed', payload: `Failed to fetch valid caller Ids ${JSON.stringify(err)}`})
  })
}

exports.updateRole = function (req, res) {
  utility.callApi('companyprofile/updateRole', 'post', {role: req.body.role, domain_email: req.body.domain_email}, 'accounts', req.headers.authorization)
    .then((result) => {
      logger.serverLog(TAG, 'result from invite endpoint accounts', 'debug')
      logger.serverLog(TAG, result, 'debug')
      res.status(200).json({status: 'success', payload: result})
    })
    .catch((err) => {
      res.status(500).json({status: 'failed', payload: `${JSON.stringify(err)}`})
    })
}

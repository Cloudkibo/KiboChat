const logger = require('../../../components/logger')
const TAG = 'api/companyprofile/company.controller.js'
const utility = require('../utility')
const needle = require('needle')
const config = require('../../../config/environment/index')
const logicLayer = require('./company.logiclayer.js')
const { sendErrorResponse, sendSuccessResponse } = require('../../global/response')
const async = require('async')

exports.members = function (req, res) {
  utility.callApi(`companyprofile/members`, 'get', {}, 'accounts', req.headers.authorization)
    .then(members => {
      sendSuccessResponse(res, 200, members)
    })
    .catch(err => {
      sendErrorResponse(res, 500, `Failed to fetch members ${err}`)
    })
}
exports.getAutomatedOptions = function (req, res) {
  utility.callApi(`companyprofile/getAutomatedOptions`, 'get', {}, 'accounts', req.headers.authorization)
    .then(payload => {
      sendSuccessResponse(res, 200, payload)
    })
    .catch(err => {
      sendErrorResponse(res, 500, `Failed to fetch automated options ${err}`)
    })
}

exports.getAdvancedSettings = function (req, res) {
  utility.callApi(`companyprofile`, 'get', {}, 'accounts', req.headers.authorization)
    .then(payload => {
      sendSuccessResponse(res, 200, payload)
    })
    .catch(err => {
      sendErrorResponse(res, 500, `Failed to fetch advanced settings in company profile ${err}`)
    })
}

exports.updateAdvancedSettings = function (req, res) {
  utility.callApi(`companyUser/query`, 'post', {domain_email: req.user.domain_email}) // fetch company user
    .then(companyUser => {
      if (!companyUser) {
        sendErrorResponse(res, 404, '', 'The user account does not belong to any company. Please contact support')
      }
      utility.callApi(`companyprofile/update`, 'put', {query: {_id: companyUser.companyId}, newPayload: req.body.updatedObject, options: {}})
        .then(updatedProfile => {
          sendSuccessResponse(res, 200, updatedProfile)
        })
        .catch(err => {
          sendErrorResponse(res, 500, `Failed to update company profile ${err}`)
        })
    })
    .catch(error => {
      sendErrorResponse(res, 500, `Failed to company user ${JSON.stringify(error)}`)
    })
}
exports.invite = function (req, res) {
  utility.callApi('companyprofile/invite', 'post', {email: req.body.email, name: req.body.name, role: req.body.role}, 'accounts', req.headers.authorization)
    .then((result) => {
      logger.serverLog(TAG, 'result from invite endpoint accounts', 'debug')
      logger.serverLog(TAG, result, 'debug')
      sendSuccessResponse(res, 200, result)
    })
    .catch((err) => {
      logger.serverLog(TAG, 'result from invite endpoint accounts', 'debug')
      logger.serverLog(TAG, err, 'debug')
      sendErrorResponse(res, 500, err)
    })
}

exports.updateRole = function (req, res) {
  utility.callApi('companyprofile/updateRole', 'post', {role: req.body.role, domain_email: req.body.domain_email}, 'accounts', req.headers.authorization)
    .then((result) => {
      logger.serverLog(TAG, 'result from invite endpoint accounts', 'debug')
      logger.serverLog(TAG, result, 'debug')
      sendSuccessResponse(res, 200, result)
    })
    .catch((err) => {
      sendErrorResponse(res, 500, err.error.payload)
    })
}

exports.updateAutomatedOptions = function (req, res) {
  utility.callApi(`companyUser/query`, 'post', {domain_email: req.user.domain_email}) // fetch company user
    .then(companyUser => {
      if (!companyUser) {
        sendErrorResponse(res, 404, '', 'The user account does not belong to any company. Please contact support')
      }
      utility.callApi(`companyprofile/update`, 'put', {query: {_id: companyUser.companyId}, newPayload: {automated_options: req.body.automated_options}, options: {}})
        .then(updatedProfile => {
          sendSuccessResponse(res, 200, updatedProfile)
        })
        .catch(err => {
          sendErrorResponse(res, 500, `Failed to update company profile ${err}`)
        })
    })
    .catch(error => {
      sendErrorResponse(res, 500, `Failed to company user ${JSON.stringify(error)}`)
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
const _updateCompanyProfile = (data, next) => {
  // if (!data.body.changeWhatsAppTwilio) {
  //   let newPayload = {twilioWhatsApp: {
  //     accountSID: data.body.accountSID,
  //     authToken: data.body.authToken,
  //     sandboxNumber: data.body.sandboxNumber.split(' ').join(''),
  //     sandboxCode: data.body.sandboxCode
  //   }}
  //   utility.callApi(`companyprofile/update`, 'put', {query: {_id: data.companyId}, newPayload: newPayload, options: {}})
  //     .then(updatedProfile => {
  //       next(null, updatedProfile)
  //     })
  //     .catch(err => {
  //       next(err)
  //     })
  // } else {
  //   next(null)
  // }
  // if (!data.body.changeWhatsAppFlockSend) {
  let newPayload = {flockSendWhatsApp: {
    accessToken: data.body.accessToken,
    number: data.body.number.split(' ').join('')
  }}
  utility.callApi(`companyprofile/update`, 'put', {query: {_id: data.companyId}, newPayload: newPayload, options: {}})
    .then(updatedProfile => {
      next(null, updatedProfile)
    })
    .catch(err => {
      next(err)
    })
  // } else {
  //   next(null)
  // }
}

const _updateUser = (data, next) => {
  if (data.body.platform) {
    utility.callApi('user/update', 'post', {query: {_id: data.userId}, newPayload: {platform: data.body.platform}, options: {}})
      .then(updated => {
        next(null, updated)
      })
      .catch(err => {
        next(err)
      })
  } else {
    next(null)
  }
}
exports.updatePlatformWhatsApp = function (req, res) {
  // let query = {
  //   _id: req.user.companyId,
  //   'twilioWhatsApp.accountSID': req.body.accountSID,
  //   'twilioWhatsApp.authToken': req.body.authToken,
  //   'twilioWhatsApp.sandboxNumber': req.body.sandboxNumber.split(' ').join(''),
  //   'twilioWhatsApp.sandboxCode': req.body.sandboxCode
  // }
  // utility.callApi(`companyprofile/query`, 'post', query) // fetch company user
  //   .then(companyprofile => {
  //     if (!companyprofile) {
  //       needle.get(
  //         `https://${req.body.accountSID}:${req.body.authToken}@api.twilio.com/2010-04-01/Accounts`,
  //         (err, resp) => {
  //           if (err) {
  //             sendErrorResponse(res, 401, 'unable to authenticate twilio account')
  //           } else if (resp.statusCode === 200) {
  //             let data = {body: req.body, companyId: req.user.companyId, userId: req.user._id}
  //             async.series([
  //               _updateCompanyProfile.bind(null, data),
  //               _updateUser.bind(null, data)
  //             ], function (err) {
  //               if (err) {
  //                 sendErrorResponse(res, 500, '', err)
  //               } else {
  //                 sendSuccessResponse(res, 200, {description: 'updated successfully', showModal: req.body.changeWhatsAppTwilio})
  //               }
  //             })
  //           } else {
  //             sendErrorResponse(res, 404, 'Twilio account not found. Please enter correct details')
  //           }
  //         })
  //     } else {
  //       sendSuccessResponse(res, 200, {description: 'updated successfully'})
  //     }
  //   })
  //   .catch(error => {
  //     sendErrorResponse(res, 500, `Failed to fetch company user ${error}`)
  //   })

  let data = {body: req.body, companyId: req.user.companyId, userId: req.user._id}
  async.series([
    _updateCompanyProfile.bind(null, data),
    _updateUser.bind(null, data)
  ], function (err) {
    if (err) {
      sendErrorResponse(res, 500, '', err)
    } else {
      sendSuccessResponse(res, 200, {description: 'updated successfully', showModal: req.body.changeWhatsAppTwilio})
    }
  })
}
exports.disconnect = function (req, res) {
  utility.callApi(`companyUser/query`, 'post', {domain_email: req.user.domain_email}) // fetch company user
    .then(companyUser => {
      if (!companyUser) {
        sendErrorResponse(res, 404, '', 'The user account does not belong to any company. Please contact support')
      }
      let updated = {}
      if (req.body.type === 'sms') {
        updated = {$unset: {twilio: 1}}
      } else {
        updated = {$unset: {flockSendWhatsApp: 1}}
      }
      let userUpdated = logicLayer.getPlatform(companyUser, req.body)
      utility.callApi(`companyprofile/update`, 'put', {query: {_id: companyUser.companyId}, newPayload: updated, options: {}})
        .then(updatedProfile => {
          utility.callApi('user/update', 'post', {query: {_id: req.user._id}, newPayload: userUpdated, options: {}})
            .then(updated => {
              sendSuccessResponse(res, 200, updatedProfile)
            })
            .catch(err => {
              sendErrorResponse(res, 500, err)
            })
          sendSuccessResponse(res, 200, updatedProfile)
        })
        .catch(err => {
          sendErrorResponse(res, 500, `Failed to update company profile ${err}`)
        })
    })
    .catch(error => {
      sendErrorResponse(res, 500, `Failed to company user ${JSON.stringify(error)}`)
    })
}

exports.fetchValidCallerIds = function (req, res) {
  let accountSid = req.body.twilio.accountSID
  let authToken = req.body.twilio.authToken
  let client = require('twilio')(accountSid, authToken)
  client.outgoingCallerIds.list()
    .then((callerIds) => {
      if (callerIds && callerIds.length > 0) {
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
                    logger.serverLog(TAG, `Contact saved successfully ${JSON.stringify(saved)}`, 'success')
                  })
                  .catch(error => {
                    logger.serverLog(TAG, `Failed to save contact ${JSON.stringify(error)}`, 'error')
                  })
              }
            })
            .catch(error => {
              logger.serverLog(TAG, `Failed to fetch contact ${JSON.stringify(error)}`, 'error')
            })
          if (index === (callerIds.length - 1)) {
            sendSuccessResponse(res, 200, 'Contacts updated successfully')
          }
        })
      }
    })
    .catch(error => {
      sendErrorResponse(res, 500, `Failed to fetch valid caller Ids ${JSON.stringify(error)}`)
    })
}
exports.deleteWhatsAppInfo = function (req, res) {
  utility.callApi('user/authenticatePassword', 'post', {email: req.user.email, password: req.body.password})
    .then(authenticated => {
      async.parallelLimit([
        function (callback) {
          let updated = {}
          // if (req.body.type === 'Disconnect') {
          //   updated = {$unset: {twilioWhatsApp: 1}}
          // } else {
          //   updated = {twilioWhatsApp: {
          //     accountSID: req.body.accountSID,
          //     authToken: req.body.authToken,
          //     sandboxNumber: req.body.sandboxNumber.split(' ').join(''),
          //     sandboxCode: req.body.sandboxCode
          //   }}
          // }
          if (req.body.type === 'Disconnect') {
            updated = {$unset: {flockSendWhatsApp: 1}}
          } else {
            updated = {twilioWhatsApp: {
              accessToken: req.body.accessToken,
              number: req.body.sandboxNumber.split(' ').join('')
            }}
          }
          utility.callApi(`companyprofile/update`, 'put', {query: {_id: req.user.companyId}, newPayload: updated, options: {}})
            .then(data => {
              data = data[0]
              callback(null, data)
            })
            .catch(err => {
              callback(err)
            })
        },
        function (callback) {
          if (req.body.type === 'Disconnect') {
            utility.callApi(`user/update`, 'post', {query: {_id: req.user._id}, newPayload: {platform: 'messenger'}, options: {}})
              .then(data => {
                callback(null)
              })
              .catch(err => {
                callback(err)
              })
          } else {
            callback(null)
          }
        },
        function (callback) {
          utility.callApi(`whatsAppContacts/deleteMany`, 'delete', {companyId: req.user.companyId})
            .then(data => {
              callback(null, data)
            })
            .catch(err => {
              callback(err)
            })
        },
        function (callback) {
          let query = {
            purpose: 'deleteMany',
            match: {companyId: req.user.companyId}
          }
          utility.callApi(`whatsAppBroadcasts`, 'delete', query, 'kiboengage')
            .then(data => {
              callback(null, data)
            })
            .catch(err => {
              callback(err)
            })
        },
        function (callback) {
          let query = {
            purpose: 'deleteMany',
            match: {companyId: req.user.companyId}
          }
          utility.callApi(`whatsAppChat`, 'delete', query, 'kibochat')
            .then(data => {
              data = data[0]
              callback(null, data)
            })
            .catch(err => {
              callback(err)
            })
        }
      ], 10, function (err, results) {
        if (err) {
          logger.serverLog(TAG, err, 'error')
          sendErrorResponse(res, 500, `Failed to delete whatsapp info ${err}`)
        } else {
          console.log('results got', results)
          sendSuccessResponse(res, 200, req.body.type === 'Disconnect' ? 'Disconnected Successfully' : 'Saved Successfully')
        }
      })
    })
    .catch((err) => {
      sendErrorResponse(res, 500, err.error.description)
    })
}

exports.getAdvancedSettings = function (req, res) {
  utility.callApi('companyprofile/query', 'post', {_id: req.user.companyId})
    .then(company => {
      sendSuccessResponse(res, 200, {saveAutomationMessages: company.saveAutomationMessages})
    })
    .catch(err => {
      logger.serverLog(TAG, err, 'error')
      sendErrorResponse(res, 500, null, 'Failed to fetch advanced settings')
    })
}

exports.updateAdvancedSettings = function (req, res) {
  utility.callApi('companyprofile/update', 'put', {query: {_id: req.user.companyId}, newPayload: req.body, options: {}})
    .then(updated => {
      sendSuccessResponse(res, 200, null, 'Updated successfully!')
    })
    .catch(err => {
      logger.serverLog(TAG, err, 'error')
      sendErrorResponse(res, 500, null, 'Failed to update advanced settings')
    })
}

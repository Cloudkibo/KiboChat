const logger = require('../../../components/logger')
const TAG = 'api/companyprofile/company.controller.js'
const utility = require('../utility')
const needle = require('needle')
const config = require('../../../config/environment/index')
const logicLayer = require('./company.logiclayer.js')
const { sendErrorResponse, sendSuccessResponse } = require('../../global/response')
const async = require('async')
const {ActionTypes} = require('../../../whatsAppMapper/constants')
const {whatsAppMapper} = require('../../../whatsAppMapper/whatsAppMapper')

exports.members = function (req, res) {
  utility.callApi(`companyprofile/members`, 'get', {}, 'accounts', req.headers.authorization)
    .then(members => {
      sendSuccessResponse(res, 200, members)
    })
    .catch(err => {
      const message = err || 'error in getting company members'
      logger.serverLog(message, `${TAG}: exports.members`, {}, {}, 'error')
      sendErrorResponse(res, 500, `Failed to fetch members ${err}`)
    })
}
exports.getAutomatedOptions = function (req, res) {
  utility.callApi(`companyprofile/getAutomatedOptions`, 'get', {}, 'accounts', req.headers.authorization)
    .then(payload => {
      utility.callApi(`user/query`, 'post', {_id: payload.ownerId, connectFacebook: true}, 'accounts', req.headers.authorization)
        .then(users => {
          if (users.length > 0) {
            let user = users[0]
            payload.facebook = user.facebookInfo
            payload.buyerInfo = {
              name: user.name,
              email: user.email
            }
            sendSuccessResponse(res, 200, payload)
          } else {
            sendSuccessResponse(res, 200, payload)
          }
        }).catch(error => {
          const message = error || 'error in getting user in getting automated options'
          logger.serverLog(message, `${TAG}: exports.getAutomatedOptions`, {}, {payload}, 'error')
          sendErrorResponse(res, 500, `Failed to fetching user details ${JSON.stringify(error)}`)
        })
    })
    .catch(err => {
      const message = err || 'error in getting automated options'
      logger.serverLog(message, `${TAG}: exports.getAutomatedOptions`, {}, {}, 'error')
      sendErrorResponse(res, 500, `Failed to fetch automated options ${err}`)
    })
}

exports.getAdvancedSettings = function (req, res) {
  utility.callApi(`companyprofile`, 'get', {}, 'accounts', req.headers.authorization)
    .then(payload => {
      sendSuccessResponse(res, 200, payload)
    })
    .catch(err => {
      const message = err || 'error in getting advanced settings'
      logger.serverLog(message, `${TAG}: exports.getAdvancedSettings`, {}, {}, 'error')
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
          const message = err || 'Failed to update company profile'
          logger.serverLog(message, `${TAG}: exports.updateAdvancedSettings`, req.body, {user: req.user}, 'error')
          sendErrorResponse(res, 500, `Failed to update company profile ${err}`)
        })
    })
    .catch(error => {
      const message = error || 'Failed to fetch company user'
      logger.serverLog(message, `${TAG}: exports.updateAdvancedSettings`, req.body, {user: req.user}, 'error')
      sendErrorResponse(res, 500, `Failed to company user ${JSON.stringify(error)}`)
    })
}

const _isUserError = (err, req) => {
  if (err === `${req.body.name} is already on KiboPush.` || err === `${req.body.name} is already a member.` || err === `${req.body.name} is already invited.`) {
    return true
  } else {
    return false
  }
}

exports.invite = function (req, res) {
  utility.callApi('companyprofile/invite', 'post', {email: req.body.email, name: req.body.name, role: req.body.role}, 'accounts', req.headers.authorization)
    .then((result) => {
      sendSuccessResponse(res, 200, result)
    })
    .catch((err) => {
      if (!_isUserError(err, req)) {
        const message = err || 'result from invite endpoint accounts'
        logger.serverLog(message, `${TAG}: exports.invite`, req.body, {user: req.user}, 'error')
      }
      sendErrorResponse(res, 500, err)
    })
}

exports.updateRole = function (req, res) {
  utility.callApi('companyprofile/updateRole', 'post', {role: req.body.role, domain_email: req.body.domain_email}, 'accounts', req.headers.authorization)
    .then((result) => {
      sendSuccessResponse(res, 200, result)
    })
    .catch((err) => {
      const message = err || 'Failed to update role'
      logger.serverLog(message, `${TAG}: exports.updateRole`, req.body, {user: req.user}, 'error')
      sendErrorResponse(res, 500, err.error.payload)
    })
}

exports.updateAutomatedOptions = function (req, res) {
  utility.callApi(`companyUser/query`, 'post', {domain_email: req.user.domain_email}) // fetch company user
    .then(companyUser => {
      if (!companyUser) {
        const message = 'The user account does not belong to any company. Please contact support'
        logger.serverLog(message, `${TAG}: exports.updateAutomatedOptions`, req.body, {user: req.user}, 'error')
        sendErrorResponse(res, 404, '', 'The user account does not belong to any company. Please contact support')
      }

      var newPayload = {
        automated_options: req.body.automated_options
      }
      if (req.body.showAgentName !== null) {
        newPayload.showAgentName = req.body.showAgentName
      }
      utility.callApi(`companyprofile/update`, 'put', {query: {_id: companyUser.companyId}, newPayload: newPayload, options: {}})
        .then(updatedProfile => {
          sendSuccessResponse(res, 200, updatedProfile)
        })
        .catch(err => {
          const message = err || 'Failed to update company profile'
          logger.serverLog(message, `${TAG}: exports.updateAutomatedOptions`, req.body, {user: req.user}, 'error')
          sendErrorResponse(res, 500, `Failed to update company profile ${err}`)
        })
    })
    .catch(error => {
      const message = error || 'Failed to fetch company user'
      logger.serverLog(message, `${TAG}: exports.updateAutomatedOptions`, req.body, {user: req.user}, 'error')
      sendErrorResponse(res, 500, `Failed to company user ${JSON.stringify(error)}`)
    })
}

exports.updatePlatform = function (req, res) {
  utility.callApi(`companyUser/query`, 'post', {domain_email: req.user.domain_email}) // fetch company user
    .then(companyUser => {
      if (!companyUser) {
        const message = 'The user account does not belong to any company. Please contact support'
        logger.serverLog(message, `${TAG}: exports.updatePlatform`, req.body, {user: req.user}, 'error')
        sendErrorResponse(res, 404, '', 'The user account does not belong to any company. Please contact support')
      }
      needle.get(
        `https://${req.body.twilio.accountSID}:${req.body.twilio.authToken}@api.twilio.com/2010-04-01/Accounts`,
        (err, resp) => {
          if (err) {
            const message = err || 'unable to authenticate twilio account'
            logger.serverLog(message, `${TAG}: exports.updatePlatform`, req.body, {user: req.user}, 'error')
            sendErrorResponse(res, 401, '', 'unable to authenticate twilio account')
          }
          if (resp.statusCode === 200) {
            let accountSid = req.body.twilio.accountSID
            let authToken = req.body.twilio.authToken
            let client = require('twilio')(accountSid, authToken)
            client.incomingPhoneNumbers
              .list().then((incomingPhoneNumbers) => {
                if (incomingPhoneNumbers && incomingPhoneNumbers.length > 0) {
                  utility.callApi(`companyprofile/update`, 'put', {query: {_id: companyUser.companyId}, newPayload: {twilio: {accountSID: req.body.twilio.accountSID, authToken: req.body.twilio.authToken}}, options: {}})
                    .then(updatedProfile => {
                      _updateUserPlatform(req, res)
                    })
                    .catch(err => {
                      const message = err || 'Failed to update company profile'
                      logger.serverLog(message, `${TAG}: exports.updatePlatform`, req.body, {user: req.user}, 'error')
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
      const message = error || 'Failed to fetch company user'
      logger.serverLog(message, `${TAG}: exports.updatePlatform`, req.body, {user: req.user}, 'error')
      sendErrorResponse(res, 500, `Failed to company user ${JSON.stringify(error)}`)
    })
}

const _updateUserPlatform = (req, res) => {
  utility.callApi(`companyUser/queryAll`, 'post', {companyId: req.user.companyId}, 'accounts')
    .then(companyUsers => {
      let userIds = companyUsers.map(companyUser => companyUser.userId._id)
      utility.callApi(`user/update`, 'post', {query: {_id: {$in: userIds}}, newPayload: { $set: {platform: 'sms'} }, options: {multi: true}})
        .then(updatedProfile => {
          sendSuccessResponse(res, 200, updatedProfile)
        })
        .catch(err => {
          const message = err || 'Failed to fetch company user'
          logger.serverLog(message, `${TAG}: exports._updateUserPlatform`, req.body, {user: req.user}, 'error')
          sendErrorResponse(res, 500, '', err)
        })
    }).catch(err => {
      const message = err || 'error in message statistics'
      logger.serverLog(message, `${TAG}: exports._updateUserPlatform`, req.body, { user: req.user }, 'error')
      sendErrorResponse(res, 500, '', err)
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
  let newPayload = data.body
  if (data.body.platform) delete newPayload.platform
  utility.callApi(`companyprofile/update`, 'put', {query: {_id: data.companyId}, newPayload: {whatsApp: newPayload}, options: {}})
    .then(updatedProfile => {
      next(null, updatedProfile)
    })
    .catch(err => {
      const message = err || 'error in updating company'
      logger.serverLog(message, `${TAG}: exports._updateCompanyProfile`, {}, { data }, 'error')
      next(err)
    })
  // } else {
  //   next(null)
  // }
}

const _updateUser = (data, next) => {
  utility.callApi(`companyUser/queryAll`, 'post', {companyId: data.companyId}, 'accounts')
    .then(companyUsers => {
      let userIds = companyUsers.map(companyUser => companyUser.userId._id)
      utility.callApi(`user/update`, 'post', {query: {_id: {$in: userIds}}, newPayload: { $set: {platform: 'whatsApp'} }, options: {multi: true}})
        .then(data => {
          next(null, data)
        })
        .catch(err => {
          const message = err || 'error in updating user'
          logger.serverLog(message, `${TAG}: exports._updateUser`, {}, { data }, 'error')
          next(err)
        })
    }).catch(err => {
      const message = err || 'error in update user'
      logger.serverLog(message, `${TAG}: exports._updateUser`, {}, { data }, 'error')
    })
}
const _setWebhook = (data, next) => {
  whatsAppMapper(data.body.provider, ActionTypes.SET_WEBHOOK, data.body)
    .then(response => {
      next(null, data)
    })
    .catch(error => {
      const message = error || 'error in whatsapp mapper'
      logger.serverLog(message, `${TAG}: exports._setWebhook`, {}, { data }, 'error')
      next(error)
    })
}
const _verifyCredentials = (data, next) => {
  whatsAppMapper(data.body.provider, ActionTypes.VERIFY_CREDENTIALS, data.body)
    .then(response => {
      next(null, data)
    })
    .catch(error => {
      next(error)
    })
}

const _checkTwilioVersion = (data, next) => {
  if (data.body.provider === 'twilio') {
    whatsAppMapper(data.body.provider, ActionTypes.CHECK_TWILLO_VERSION, data.body)
      .then(response => {
        let businessNumbers = response.businessNumbers
        response = response.twilioVersionResponse
        if (response.body.type === 'Trial' && !data.body.sandBoxCode) {
          next(new Error('This is a trial account. Please connect a paid version of Twilio account.'))
        } else if (response.body.type === 'full' && !businessNumbers.includes(data.body.businessNumber)) {
          next(new Error('Please add correct whatsapp business number'))
        } else {
          next(null, data)
        }
      })
      .catch(error => {
        const message = error || 'error in whatsapp mapper'
        logger.serverLog(message, `${TAG}: exports._checkTwilioVersion`, {}, { data }, 'error')
        next(error)
      })
  } else {
    next(null, data)
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
  req.body.businessNumber = req.body.businessNumber.replace(/[- )(]/g, '')
  let query = [
    {$match: {_id: {$ne: req.user.companyId}, 'whatsApp.businessNumber': req.body.businessNumber}},
    {$lookup: {from: 'users', localField: 'ownerId', foreignField: '_id', as: 'user'}},
    {'$unwind': '$user'}
  ]
  utility.callApi(`companyprofile/aggregate`, 'post', query) // fetch company user
    .then(companyprofile => {
      if (!companyprofile[0] || req.body.businessNumber === '+14155238886') {
        let data = {body: req.body, companyId: req.user.companyId, userId: req.user._id, isSuperUser: req.user.isSuperUser}
        async.series([
          _verifyCredentials.bind(null, data),
          _checkTwilioVersion.bind(null, data),
          _updateCompanyProfile.bind(null, data),
          _updateUser.bind(null, data),
          _setWebhook.bind(null, data)
        ], function (err) {
          if (err) {
            if (err.message && (err.message.includes('trial account') ||
            err.message.includes('invalid Flock send access token') ||
            err.message.includes('Twilio account not found') ||
            err.message.includes('incorrect credentials')
            )) {
            } else {
              const message = err || 'error in async series call'
              logger.serverLog(message, `${TAG}: exports.updatePlatformWhatsApp`, req.body, { user: req.user }, 'error')
            }
            sendErrorResponse(res, 500, '', `${err}`)
          } else {
            sendSuccessResponse(res, 200, {description: 'updated successfully', showModal: req.body.changeWhatsAppTwilio})
          }
        })
      } else {
        sendErrorResponse(res, 500, '', `This WhatsApp Number is already connected by ${companyprofile[0].user.email}. Please contact them`)
      }
    })
    .catch((err) => {
      const message = err || 'Failed to fetch company'
      logger.serverLog(message, `${TAG}: exports.updatePlatformWhatsApp`, req.body, { user: req.user }, 'error')
      sendErrorResponse(res, 500, `Failed to fetch company ${err}`)
    })
}
exports.disconnect = function (req, res) {
  utility.callApi(`companyprofile/query`, 'post', {ownerId: req.user._id})
    .then(company => {
      let updated = {$unset: {twilio: 1}}
      let platform = logicLayer.getPlatformForSms(company, req.user)
      utility.callApi(`companyprofile/update`, 'put', {query: {_id: req.user.companyId}, newPayload: updated, options: {}})
        .then(updatedProfile => {
          utility.callApi(`companyUser/queryAll`, 'post', {companyId: req.user.companyId}, 'accounts')
            .then(companyUsers => {
              let userIds = companyUsers.map(companyUser => companyUser.userId._id)
              utility.callApi(`user/update`, 'post', {query: {_id: {$in: userIds}}, newPayload: { $set: {platform: platform} }, options: {multi: true}})
                .then(data => {
                  sendSuccessResponse(res, 200, updatedProfile)
                })
                .catch(err => {
                  const message = err || 'Failed to update user'
                  logger.serverLog(message, `${TAG}: exports.disconnect`, {}, { user: req.user }, 'error')
                  sendErrorResponse(res, 500, err)
                })
            }).catch(err => {
              const message = err || 'error in disconnect'
              logger.serverLog(message, `${TAG}: exports.disconnect`, {}, {user: req.user}, 'error')
            })
        })
        .catch(err => {
          const message = err || 'Failed to update company profile'
          logger.serverLog(message, `${TAG}: exports.disconnect`, {}, {user: req.user}, 'error')
          sendErrorResponse(res, 500, `Failed to update company profile ${err}`)
        })
    })
    .catch(error => {
      const message = error || 'Failed to fetchcompany user'
      logger.serverLog(message, `${TAG}: exports.disconnect`, {}, {user: req.user}, 'error')
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
                  })
                  .catch(error => {
                    const message = error || 'Failed to save contact'
                    logger.serverLog(message, `${TAG}: exports.fetchValidCallerIds`, req.body, {user: req.user}, 'error')
                  })
              }
            })
            .catch(error => {
              const message = error || 'Failed to fetch contact'
              logger.serverLog(message, `${TAG}: exports.fetchValidCallerIds`, req.body, {user: req.user}, 'error')
            })
          if (index === (callerIds.length - 1)) {
            sendSuccessResponse(res, 200, 'Contacts updated successfully')
          }
        })
      }
    })
    .catch(error => {
      const message = error || 'Failed to fetch contact'
      logger.serverLog(message, `${TAG}: exports.fetchValidCallerIds`, req.body, {user: req.user}, 'error')
      sendErrorResponse(res, 500, `Failed to fetch valid caller Ids ${JSON.stringify(error)}`)
    })
}
exports.deleteWhatsAppInfo = function (req, res) {
  utility.callApi('user/authenticatePassword', 'post', {email: req.user.email, password: req.body.password})
    .then(authenticated => {
      utility.callApi(`companyprofile/query`, 'post', {ownerId: req.user._id})
        .then(company => {
          async.parallelLimit([
            function (callback) {
              let updated = {}
              if (req.body.type === 'Disconnect' && !req.body.connected) {
                updated = {'whatsApp.connected': req.body.connected, 'whatsApp.dateDisconnected': req.body.Date}
              } else if (req.body.type === 'Disconnect') {
                updated = {$unset: {whatsApp: 1}}
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
                  const message = err || 'Failed to update company profile'
                  logger.serverLog(message, `${TAG}: exports.deleteWhatsAppInfo`, req.body, {user: req.user}, 'error')
                  callback(err)
                })
            },
            function (callback) {
              let platform = logicLayer.getPlatformForWhatsApp(company, req.user)
              utility.callApi(`companyUser/queryAll`, 'post', {companyId: req.user.companyId}, 'accounts')
                .then(companyUsers => {
                  let userIds = companyUsers.map(companyUser => companyUser.userId._id)
                  utility.callApi(`user/update`, 'post', {query: {_id: {$in: userIds}}, newPayload: { $set: {platform: platform} }, options: {multi: true}})
                    .then(data => {
                      callback(null)
                    })
                    .catch(err => {
                      const message = err || 'Failed to update user profile'
                      logger.serverLog(message, `${TAG}: exports.deleteWhatsAppInfo`, req.body, {user: req.user}, 'error')
                      callback(err)
                    })
                }).catch(err => {
                  const message = err || 'error in companyUser'
                  logger.serverLog(message, `${TAG}: exports.deleteWhatsAppInfo`, req.body, {user: req.user}, 'error')
                })
            },
            function (callback) {
              if (req.body.type === 'Disconnect' && req.body.connected) {
                utility.callApi(`whatsAppContacts/deleteMany`, 'delete', {companyId: req.user.companyId})
                  .then(data => {
                    callback(null, data)
                  })
                  .catch(err => {
                    const message = err || 'whatsapp contact delete many'
                    logger.serverLog(message, `${TAG}: exports.deleteWhatsAppInfo`, req.body, {user: req.user}, 'error')
                    callback(err)
                  })
              } else {
                callback(null)
              }
            },
            function (callback) {
              if (req.body.type === 'Disconnect' && req.body.connected) {
                let query = {
                  purpose: 'deleteMany',
                  match: {companyId: req.user.companyId}
                }
                utility.callApi(`whatsAppBroadcasts`, 'delete', query, 'kiboengagedblayer')
                  .then(data => {
                    callback(null, data)
                  })
                  .catch(err => {
                    const message = err || 'whatsapp broadcast delete error'
                    logger.serverLog(message, `${TAG}: exports.deleteWhatsAppInfo`, req.body, {user: req.user}, 'error')
                    callback(err)
                  })
              } else {
                callback(null)
              }
            },
            function (callback) {
              if (req.body.type === 'Disconnect' && req.body.connected && company.whatsApp.provider !== 'flockSend') {
                let query = {
                  purpose: 'deleteMany',
                  match: {companyId: req.user.companyId}
                }
                utility.callApi(`whatsAppBroadcastMessages`, 'delete', query, 'kiboengagedblayer')
                  .then(data => {
                    callback(null, data)
                  })
                  .catch(err => {
                    const message = err || 'whatsapp broadcast messages delete error'
                    logger.serverLog(message, `${TAG}: exports.deleteWhatsAppInfo`, req.body, {user: req.user}, 'error')
                    callback(err)
                  })
              } else {
                callback(null)
              }
            },
            function (callback) {
              if (req.body.type === 'Disconnect' && req.body.connected) {
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
                    const message = err || 'whatsapp chat messages delete error'
                    logger.serverLog(message, `${TAG}: exports.deleteWhatsAppInfo`, req.body, {user: req.user}, 'error')
                    callback(err)
                  })
              } else {
                callback(null)
              }
            }
          ], 10, function (err, results) {
            if (err) {
              const message = err || 'Failed to delete whatsapp info'
              logger.serverLog(message, `${TAG}: exports.deleteWhatsAppInfo`, req.body, req.user, 'error')
              sendErrorResponse(res, 500, `Failed to delete whatsapp info ${err}`)
            } else {
              if (req.body.type === 'Disconnect' && req.body.connected && company.whatsApp.provider === 'flockSend') {
                deleteWhatsappMessages(req.user.companyId, 0, 50)
              }
              sendSuccessResponse(res, 200, req.body.type === 'Disconnect' ? 'Disconnected Successfully' : 'Saved Successfully')
            }
          })
        })
        .catch((err) => {
          const message = err || 'failed to fetch company profile'
          logger.serverLog(message, `${TAG}: exports.deleteWhatsAppInfo`, req.body, req.user, 'error')
          sendErrorResponse(res, 500, err)
        })
    })
    .catch((err) => {
      const message = err || 'failed to authenticate user'
      if (message !== 'Incorrect password') {
        logger.serverLog(message, `${TAG}: exports.deleteWhatsAppInfo`, req.body, req.user, 'error')
      }
      sendErrorResponse(res, 500, err)
    })
}

const deleteWhatsappMessages = (companyId, skipRecords, LimitRecords) => {
  let query = {
    purpose: 'aggregate',
    match: {companyId: companyId},
    skip: skipRecords,
    limit: LimitRecords
  }
  utility.callApi('whatsAppBroadcastMessages/query', 'post', query, 'kiboengagedblayer')
    .then(messages => {
      let messageIds = messages.map(message => message.messageId)
      if (messages.length > 0) {
        utility.callApi(
          'queue',
          'delete',
          {purpose: 'deleteMany', match: {'payload.id': {$in: messageIds}}},
          'kiboengagedblayer')
          .then(deleted => {
            deleteWhatsappMessages(companyId, skipRecords + 50, LimitRecords)
          })
          .catch(err => {
            const message = err || 'failed to authenticate user'
            logger.serverLog(message, `${TAG}: exports.deleteWhatsappMessages`, {}, {companyId, skipRecords, LimitRecords}, 'error')
          })
      } else {
        let query = {
          purpose: 'deleteMany',
          match: {companyId: companyId}
        }
        utility.callApi(`whatsAppBroadcastMessages`, 'delete', query, 'kiboengagedblayer')
          .then(deleted => {
          }).catch(err => {
            const message = err || 'failed to delete whatsapp broadcast messages'
            logger.serverLog(message, `${TAG}: exports.deleteWhatsappMessages`, {}, {companyId, skipRecords, LimitRecords}, 'error')
          })
      }
    }).catch(err => {
      const message = err || 'failed to fetch whatsapp broadcast messages'
      logger.serverLog(message, `${TAG}: exports.deleteWhatsappMessages`, {}, {companyId, skipRecords, LimitRecords}, 'error')
    })
}

exports.getAdvancedSettings = function (req, res) {
  utility.callApi('companyprofile/query', 'post', {_id: req.user.companyId})
    .then(company => {
      sendSuccessResponse(res, 200, { saveAutomationMessages: company.saveAutomationMessages, hideChatSessions: company.hideChatSessions })
    })
    .catch(err => {
      const message = err || 'Failed to fetch advanced settings'
      logger.serverLog(message, `${TAG}: exports.getAdvancedSettings`, {}, { user: req.user }, 'error')
      sendErrorResponse(res, 500, null, 'Failed to fetch advanced settings')
    })
}

exports.updateAdvancedSettings = function (req, res) {
  utility.callApi('companyprofile/update', 'put', {query: {_id: req.user.companyId}, newPayload: req.body, options: {}})
    .then(updated => {
      sendSuccessResponse(res, 200, null, 'Updated successfully!')
    })
    .catch(err => {
      const message = err || 'Failed to update advanced settings'
      logger.serverLog(message, `${TAG}: exports.updateAdvancedSettings`, req.body, { user: req.user }, 'error')
      sendErrorResponse(res, 500, null, 'Failed to update advanced settings')
    })
}

exports.disableMember = function (req, res) {
  utility.callApi('user/authenticatePassword', 'post', {email: req.user.email, password: req.body.password})
    .then(authenticated => {
      utility.callApi('companyprofile/disableMember', 'post', {memberId: req.body.memberId}, 'accounts', req.headers.authorization)
        .then(result => {
          sendSuccessResponse(res, 200, result, 'Member has been deactivated')
        })
        .catch(err => {
          const message = err || 'Failed to deactivate member'
          logger.serverLog(message, `${TAG}: exports.disableMember`, {}, { user: req.user }, 'error')
          sendErrorResponse(res, 500, null, 'Failed to deactivate member')
        })
    })
    .catch(err => {
      const message = err || 'Failed to deactivate member'
      logger.serverLog(message, `${TAG}: exports.disableMember`, {}, { user: req.user }, 'error')
      sendErrorResponse(res, 500, 'Incorrect password', `Incorrect password`)
    })
}

exports.enableMember = function (req, res) {
  utility.callApi('user/update', 'post', {query: {_id: req.body.memberId}, newPayload: {disableMember: false}, options: {upsert: true}}, 'accounts', req.headers.authorization)
    .then(result => {
      sendSuccessResponse(res, 200, result, 'Member has been activated')
    })
    .catch(err => {
      const message = err || 'Failed to activate member'
      logger.serverLog(message, `${TAG}: exports.enableMember`, {}, { user: req.user }, 'error')
      sendErrorResponse(res, 500, 'Incorrect password', `Incorrect password`)
    })
}

exports.getWhatsAppMessageTemplates = function (req, res) {
  whatsAppMapper(req.user.whatsApp.provider, ActionTypes.GET_TEMPLATES, {whatsApp: req.user.whatsApp})
    .then(templates => {
      sendSuccessResponse(res, 200, templates, 'Retrieved templates successfully')
    })
    .catch(error => {
      const message = error || 'Error retrieving templates'
      logger.serverLog(message, `${TAG}: exports.getWhatsAppMessageTemplates`, {}, { user: req.user }, 'error')
      sendErrorResponse(res, 500, error, 'Error retrieving templates')
    })
}

const logger = require('../../../components/logger')
const TAG = 'api/v1/companyprofile/company.controller.js'
const utility = require('../utility')
const config = require('../../../config/environment/index')
const needle = require('needle')
const logicLayer = require('./company.logiclayer.js')

exports.members = function (req, res) {
  utility.callApi(`companyprofile/members`, 'get', {}, req.headers.authorization)
    .then(members => {
      res.status(200).json({status: 'success', payload: members})
    })
    .catch(err => {
      res.status(500).json({status: 'failed', payload: `Failed to fetch members ${err}`})
    })
}
exports.getAutomatedOptions = function (req, res) {
  utility.callApi(`companyprofile/getAutomatedOptions`, 'get', {}, req.headers.authorization)
    .then(payload => {
      res.status(200).json({status: 'success', payload: payload})
    })
    .catch(err => {
      res.status(500).json({status: 'failed', payload: `Failed to fetch automated options ${err}`})
    })
}

exports.invite = function (req, res) {
  logger.serverLog(TAG, `invite request ${JSON.stringify(req.body)}`)
  utility.callApi('companyprofile/invite', 'post', {email: req.body.email, name: req.body.name, role: req.body.role}, req.headers.authorization)
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
  utility.callApi(`companyUser/query`, 'post', {domain_email: req.user.domain_email}, req.headers.authorization) // fetch company user
    .then(companyUser => {
      if (!companyUser) {
        return res.status(404).json({
          status: 'failed',
          description: 'The user account does not belong to any company. Please contact support'
        })
      }
      utility.callApi(`companyprofile/update`, 'put', {query: {_id: companyUser.companyId}, newPayload: {automated_options: req.body.automated_options}, options: {}}, req.headers.authorization)
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
  utility.callApi(`companyUser/query`, 'post', {domain_email: req.user.domain_email}, req.headers.authorization) // fetch company user
    .then(companyUser => {
      if (!companyUser) {
        return res.status(404).json({
          status: 'failed',
          description: 'The user account does not belong to any company. Please contact support'
        })
      }
      needle.get(
        `https://${req.body.twilio.accountSID}:${req.body.twilio.authToken}@api.twilio.com/2010-04-01/Accounts`,
        (err, resp) => {
          console.log('response from twiliostatus code', resp.statusCode)
          if (err) {
            return res.status(500).json({
              status: 'failed',
              description: 'unable to authenticate twilio account'
            })
          }
          if (resp.statusCode === 200) {
            utility.callApi(`companyprofile/update`, 'put', {query: {_id: companyUser.companyId}, newPayload: {twilio: req.body.twilio}, options: {}}, req.headers.authorization)
              .then(updatedProfile => {
                if (req.body.twilio.platform) {
                  utility.callApi('user/update', 'post', {query: {_id: req.user._id}, newPayload: {platform: req.body.twilio.platform}, options: {}})
                    .then(updated => {
                    })
                    .catch(err => {
                      res.status(500).json({status: 'failed', payload: err})
                    })
                }
                let accountSid = req.body.twilio.accountSID
                let authToken = req.body.twilio.authToken
                let client = require('twilio')(accountSid, authToken)
                client.incomingPhoneNumbers
                  .list().then((incomingPhoneNumbers) => {
                    for (let i = 0; i < incomingPhoneNumbers.length; i++) {
                      client.incomingPhoneNumbers(incomingPhoneNumbers[i].sid)
                        .update({
                          accountSid: req.body.twilio.accountSID,
                          smsUrl: `${config.api_urls['webhook']}/webhooks/twilio/receiveSms`
                        })
                        .then(result => {
                          console.log('result from updating webhook', result)
                        })
                    }
                  })
                return res.status(200).json({status: 'success', payload: updatedProfile})
              })
              .catch(err => {
                console.log(`Failed to update company profile ${err}`)
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
      console.log(`Failed to company user ${JSON.stringify(error)}`)
      return res.status(500).json({status: 'failed', payload: `Failed to company user ${JSON.stringify(error)}`
      })
    })
}
exports.updatePlatformWhatsApp = function (req, res) {
  console.log('inside updatePlatformWhatsApp')
  utility.callApi(`companyUser/query`, 'post', {domain_email: req.user.domain_email}, req.headers.authorization) // fetch company user
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
          console.log('response from twiliostatus code', resp.statusCode)
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
            utility.callApi(`companyprofile/update`, 'put', {query: {_id: companyUser.companyId}, newPayload: newPayload, options: {}}, req.headers.authorization)
              .then(updatedProfile => {
                if (req.body.platform) {
                  utility.callApi('user/update', 'post', {query: {_id: req.user._id}, newPayload: {platform: req.body.platform}, options: {}})
                    .then(updated => {
                      console.log('user updated', updated)
                    })
                    .catch(err => {
                      res.status(500).json({status: 'failed', payload: err})
                    })
                }
                console.log('returning', updatedProfile)
                return res.status(200).json({status: 'success', payload: updatedProfile})
              })
              .catch(err => {
                console.log(`Failed to update company profile ${err}`)
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
      console.log(`Failed to company user ${JSON.stringify(error)}`)
      return res.status(500).json({status: 'failed', payload: `Failed to company user ${JSON.stringify(error)}`
      })
    })
}
exports.disconnect = function (req, res) {
  utility.callApi(`companyUser/query`, 'post', {domain_email: req.user.domain_email}, req.headers.authorization) // fetch company user
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
      utility.callApi(`companyprofile/update`, 'put', {query: {_id: companyUser.companyId}, newPayload: updated, options: {}}, req.headers.authorization)
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

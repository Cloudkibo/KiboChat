const logger = require('../../../components/logger')
const TAG = 'api/v1/companyprofile/company.controller.js'
const utility = require('../utility')
// const logicLayer = require('./commentCapture.logiclayer')

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

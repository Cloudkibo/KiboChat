const logger = require('../../../components/logger')
const TAG = '/api/v1.1/jsonAd/jsonAd.controller.js'

const { callApi } = require('../utility')

exports.create = function (req, res) {
  logger.serverLog(TAG, 'Hit the create json ad endpoint', 'debug')
  callApi(`jsonAd/create`, 'post', req.body)
    .then(jsonAd => {
      res.status(200).json({status: 'success', payload: jsonAd})
    })
    .catch(err => {
      res.status(500).json({status: 'failed', description: `Failed to create json Ad ${err}`})
    })
}

exports.edit = function (req, res) {
  logger.serverLog(TAG, 'Hit the edit json ad endpoint', 'debug')
  callApi(`jsonAd/edit`, 'post', req.body)
    .then(jsonAd => {
      res.status(200).json({status: 'success', payload: jsonAd})
    })
    .catch(err => {
      res.status(500).json({status: 'failed', description: `Failed to edit json Ad ${err}`})
    })
}

exports.getAll = function (req, res) {
  logger.serverLog(TAG, 'Hit the get all json ads endpoint', 'debug')
  callApi(`companyUser/query`, 'post', { domain_email: req.user.domain_email })
    .then(companyUser => {
      if (!companyUser) {
        return res.status(404).json({
          status: 'failed',
          description: 'The user account does not belong to any company. Please contact support'
        })
      }
      callApi(`jsonAd/query`, 'post', {companyId: companyUser.companyId})
        .then(jsonAds => {
          res.status(200).json({status: 'success', payload: jsonAds})
        })
        .catch(err => {
          res.status(500).json({status: 'failed', description: `Failed to fetch json Ads ${err}`})
        })
    })
    .catch(error => {
      return res.status(500).json({
        status: 'failed',
        payload: `Failed to fetch company user ${JSON.stringify(error)}`
      })
    })
}

exports.getOne = function (req, res) {
  logger.serverLog(TAG, 'Hit the get one json ad endpoint', 'debug')
  callApi(`jsonAd/${req.params.id}`, 'get', {})
    .then(jsonAd => {
      res.status(200).json({status: 'success', payload: jsonAd})
    })
    .catch(err => {
      res.status(500).json({status: 'failed', description: `Failed to fetch json Ad ${err}`})
    })
}

exports.deleteOne = function (req, res) {
  logger.serverLog(TAG, 'Hit the delete json ad endpoint', 'debug')
  callApi(`jsonAd/delete/${req.params.id}`, 'delete', {})
    .then(jsonAd => {
      res.status(200).json({status: 'success', payload: jsonAd})
    })
    .catch(err => {
      res.status(500).json({status: 'failed', description: `Failed to fetch json Ad ${err}`})
    })
}

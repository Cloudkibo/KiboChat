const logger = require('../../../components/logger')
const TAG = '/api/v1.1/jsonAd/jsonAd.controller.js'

const { callApi } = require('../utility')

exports.create = function (req, res) {
  logger.serverLog(TAG, 'Hit the create json ad endpoint')
  callApi(`jsonAd/create`, 'post', req.body, req.headers.authorization)
    .then(jsonAd => {
      res.status(200).json({status: 'success', payload: jsonAd})
    })
    .catch(err => {
      res.status(500).json({status: 'failed', description: `Failed to create json Ad ${err}`})
    })
}

exports.edit = function (req, res) {
  logger.serverLog(TAG, 'Hit the edit json ad endpoint')
  callApi(`jsonAd/edit`, 'put', req.body, req.headers.authorization)
    .then(jsonAd => {
      res.status(200).json({status: 'success', payload: jsonAd})
    })
    .catch(err => {
      res.status(500).json({status: 'failed', description: `Failed to edit json Ad ${err}`})
    })
}

exports.getAll = function (req, res) {
  logger.serverLog(TAG, 'Hit the get all json ads endpoint')
  callApi(`jsonAd/`, 'get', {}, req.headers.authorization)
    .then(jsonAds => {
      res.status(200).json({status: 'success', payload: jsonAds})
    })
    .catch(err => {
      res.status(500).json({status: 'failed', description: `Failed to fetch json Ads ${err}`})
    })
}

exports.getOne = function (req, res) {
  logger.serverLog(TAG, 'Hit the get one json ad endpoint')
  callApi(`jsonAd/${req.params.id}`, 'get', {}, req.headers.authorization)
    .then(jsonAd => {
      res.status(200).json({status: 'success', payload: jsonAd})
    })
    .catch(err => {
      res.status(500).json({status: 'failed', description: `Failed to fetch json Ad ${err}`})
    })
}

exports.deleteOne = function (req, res) {
  logger.serverLog(TAG, 'Hit the delete json ad endpoint')
  callApi(`jsonAd/${req.params.id}`, 'get', req.headers.authorization)
    .then(jsonAd => {
      res.status(200).json({status: 'success', payload: jsonAd})
    })
    .catch(err => {
      res.status(500).json({status: 'failed', description: `Failed to fetch json Ad ${err}`})
    })
}

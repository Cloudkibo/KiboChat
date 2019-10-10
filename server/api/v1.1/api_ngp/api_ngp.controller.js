/**
 * Created by sojharo on 24/11/2017.
 */

// eslint-disable-next-line no-unused-vars
const logger = require('../../../components/logger')
// eslint-disable-next-line no-unused-vars
const TAG = 'api/api_ngp/api_ngp.controller.js'
const { sendSuccessResponse, sendErrorResponse } = require('../../global/response')
const _ = require('lodash')
const utility = require('../utility')

exports.index = function (req, res) {
  if (!_.has(req.body, 'company_id')) {
    sendErrorResponse(res, 400, '', 'Parameters are missing. company_id is required')
  }
  utility.callApi(`api_ngp/query`, 'post', { company_id: req.body.company_id })
    .then(settings => {
      sendSuccessResponse(res, 200, settings)
    })
    .catch(error => {
      sendErrorResponse(res, 500, '', `API settings not initialized or invalid user. Call enable API to initialize them.${error}`)
    })
}

exports.enable = function (req, res) {
  if (!_.has(req.body, 'company_id')) {
    sendErrorResponse(res, 400, '', 'Parameters are missing. company_id is required')
  }
  utility.callApi(`api_ngp/query`, 'post', { company_id: req.body.company_id })
    .then(settings => {
      if (!settings) {
        utility.callApi(`api_ngp/enable`, 'post', { company_id: req.body.company_id, enabled: true })
          .then(savedSettings => {
            sendSuccessResponse(res, 200, savedSettings)
          })
          .catch(error => {
            sendErrorResponse(res, 500, '', `Failed to enable api ${JSON.stringify(error)}`)
          })
      } else {
        settings.enabled = true
        utility.callApi(`api_ngp/enable`, 'post', { settings: settings })
          .then(savedSettings => {
            sendSuccessResponse(res, 200, savedSettings)
          })
          .catch(error => {
            sendErrorResponse(res, 500, '', `Failed to enable api ${JSON.stringify(error)}`)
          })
      }
    })
    .catch(error => {
      sendErrorResponse(res, 500, '', `API settings not initialized or invalid user. Call enable API to initialize them.${error}`)
    })
}

exports.disable = function (req, res) {
  if (!_.has(req.body, 'company_id')) {
    sendErrorResponse(res, 400, '', 'Parameters are missing. company_id is required')
  }
  utility.callApi(`api_ngp/query`, 'post', { company_id: req.body.company_id })
    .then(settings => {
      settings.enabled = false
      utility.callApi(`api_ngp/enable`, 'post', { settings: settings })
        .then(savedSettings => {
          sendSuccessResponse(res, 200, savedSettings)
        })
        .catch(error => {
          sendErrorResponse(res, 500, '', `Failed to enable api ${JSON.stringify(error)}`)
        })
    })
    .catch(error => {
      sendErrorResponse(res, 500, '', `API settings not initialized or invalid user. Call enable API to initialize them.${error}`)
    })
}

exports.save = function (req, res) {
  logger.serverLog(TAG, `incoming body ${JSON.stringify(req.body)}`, 'debug')

  if (!_.has(req.body, 'company_id')) {
    sendErrorResponse(res, 400, '', 'Parameters are missing. company_id is required')
  }

  if (!_.has(req.body, 'app_id')) {
    sendErrorResponse(res, 400, '', 'Parameters are missing. app_id is required')
  }

  if (!_.has(req.body, 'app_secret')) {
    sendErrorResponse(res, 400, '', 'Parameters are missing. app_secret is required')
  }

  if (req.body.app_id === '') {
    sendErrorResponse(res, 400, '', 'Parameters are missing. app_id or app name should not be empty.')
  }

  if (req.body.app_secret === '') {
    sendErrorResponse(res, 400, '', 'Parameters are missing. app_secret or app key should not be empty.')
  }
  utility.callApi(`api_ngp/query`, 'post', { company_id: req.body.company_id })
    .then(settings => {
      settings.app_id = req.body.app_id
      settings.app_secret = req.body.app_secret
      utility.callApi(`api_ngp/save`, 'post', { settings: settings })
        .then(savedSettings => {
          console.log('savedSettings', savedSettings)
          sendSuccessResponse(res, 200, savedSettings)
        })
        .catch(error => {
          sendErrorResponse(res, 500, '', `Failed to enable api ${JSON.stringify(error)}`)
        })
    })
    .catch(error => {
      sendErrorResponse(res, 500, '', `API settings not initialized or invalid user. Call enable API to initialize them.${error}`)
    })
}

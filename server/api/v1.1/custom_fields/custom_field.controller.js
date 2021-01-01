const logger = require('../../../components/logger')
const TAG = 'api/custom_field/custom_field.controller.js'
const CUSTOMFIELD = 'api/custom_field/custom_field.controller.js'
const callApi = require('../utility')
const { sendErrorResponse, sendSuccessResponse } = require('../../global/response')

exports.index = function (req, res) {
  callApi.callApi('companyuser/query', 'post', { domain_email: req.user.domain_email })
    .then(companyUser => {
      if (!companyUser) {
        sendErrorResponse(res, 404, '', 'The user account does not belong to any company. Please contact support')
      }
      callApi.callApi('custom_fields/query', 'post', { purpose: 'findAll', match: { $or: [{companyId: companyUser.companyId}, {default: true}] } })
        .then(customFields => {
          sendSuccessResponse(res, 200, customFields)
        })
        .catch(err => {
          if (err) {
            const message = err || 'Internal Server Error in fetching customFields'
            logger.serverLog(message, `${TAG}: exports.index`, {}, {user: req.user}, 'error')
            sendErrorResponse(res, 500, '', `Internal Server Error in fetching customFields${JSON.stringify(err)}`)
          }
        })
    })
    .catch(err => {
      if (err) {
        const message = err || 'Internal Server Error in fetching customer'
        logger.serverLog(message, `${TAG}: exports.index`, {}, {user: req.user}, 'error')
        sendErrorResponse(res, 500, '', `Internal Server Error in fetching customer${JSON.stringify(err)}`)
      }
    })
}

function isAlreadyExistCustomField (err, customFieldName) {
  if (err && err === `${customFieldName} custom field already exists`) {
    return true
  } else {
    return false
  }
}

exports.create = function (req, res) {
  callApi.callApi('companyUser/query', 'post', { domain_email: req.user.domain_email })
    .then(companyUser => {
      if (!companyUser) {
        sendErrorResponse(res, 404, '', 'The user account does not belong to any company. Please contact support')
      }
      let customFieldPayload = {
        name: req.body.name,
        type: req.body.type,
        description: req.body.description,
        companyId: companyUser.companyId,
        createdBy: req.user._id
      }
      callApi.callApi('custom_fields/', 'post', customFieldPayload)
        .then(newCustomField => {
          require('./../../../config/socketio').sendMessageToClient({
            room_id: companyUser.companyId,
            body: {
              action: 'new_custom_field',
              payload: {
                newCustomField
              }
            }
          })
          sendSuccessResponse(res, 200, newCustomField)
        })
        .catch(err => {
          let userError = isAlreadyExistCustomField(err, req.body.name)
          if (!userError) {
            const message = err || 'Internal Server Error in custom fields'
            logger.serverLog(message, `${TAG}: exports.index`, req.body, {user: req.user}, 'error')
          }
          sendErrorResponse(res, 500, '', err)
        })
    })
    .catch(err => {
      const message = err || 'Internal Server Error in fetching company user'
      logger.serverLog(message, `${TAG}: exports.index`, req.body, {user: req.user}, 'error')
      sendErrorResponse(res, 500, '', `Internal Server Error in fetching company user${JSON.stringify(err)}`)
    })
}

exports.update = function (req, res) {
  callApi.callApi('custom_fields/query', 'post', { purpose: 'findOne', match: { _id: req.body.customFieldId, $or: [{companyId: req.user.companyId}, {default: true}] } })
    .then(fieldPayload => {
      if (!fieldPayload) {
        sendErrorResponse(res, 500, '', 'No Custom field is available on server with given customFieldId.')
      }
      let updatedPayload = {}
      if (req.body.updated.name) updatedPayload.name = req.body.updated.name
      if (req.body.updated.type) updatedPayload.type = req.body.updated.type
      updatedPayload.description = req.body.updated.description
      updatedPayload.companyId = req.user.companyId
      callApi.callApi('custom_fields/', 'put', { purpose: 'updateOne', match: { _id: req.body.customFieldId }, updated: updatedPayload })
        .then(updated => {
          require('./../../../config/socketio').sendMessageToClient({
            room_id: req.user.companyId,
            body: {
              action: 'custom_field_update',
              payload: {
                customFieldId: req.body.customFieldId,
                updated: req.body.updated
              }
            }
          })
          sendSuccessResponse(res, 200, updated)
        })
        .catch(err => {
          let userError = isAlreadyExistCustomField(err, req.body.updated.name)
          if (!userError) {
            const message = err || 'Internal Server Error in updating custom fields'
            logger.serverLog(message, `${TAG}: exports.update`, req.body, {user: req.user}, 'error')
          }
          sendErrorResponse(res, 500, '', err)
        })
    })
    .catch(err => {
      const message = err || 'Internal Server Error in finding custom fields'
      logger.serverLog(message, `${TAG}: exports.update`, req.body, {user: req.user}, 'error')
      sendErrorResponse(res, 500, '', `can not find custom field with given information${JSON.stringify(err)}`)
    })
}

exports.delete = function (req, res) {
  callApi.callApi('custom_field_subscribers/query', 'post', { purpose: 'findOne', match: { customFieldId: req.body.customFieldId } })
    .then(foundCustomField => {
      if (foundCustomField) {
        callApi.callApi('custom_field_subscribers/', 'delete', { purpose: 'deleteMany', match: { customFieldId: req.body.customFieldId } })
          .then(() => {
            callApi.callApi('custom_fields/', 'delete', { purpose: 'deleteOne', match: { _id: req.body.customFieldId } })
              .then(fieldPayload => {
                require('./../../../config/socketio').sendMessageToClient({
                  room_id: req.user.companyId,
                  body: {
                    action: 'custom_field_remove',
                    payload: {
                      customFieldId: req.body.customFieldId
                    }
                  }
                })
                sendSuccessResponse(res, 200, 'Custom Field removed successfully')
              })
              .catch(err => {
                const message = err || 'Failed to remove custom field'
                logger.serverLog(message, `${TAG}: exports.delete`, req.body, {user: req.user}, 'error')
                sendErrorResponse(res, 500, '', `Failed to remove custom field ${err}`)
              })
          })
          .catch(err => {
            const message = err || 'Failed to remove custom field subscriber'
            logger.serverLog(message, `${TAG}: exports.delete`, req.body, {user: req.user}, 'error')
            sendErrorResponse(res, 500, '', `Failed to remove custom field subscriber${err}`)
          })
      } else {
        callApi.callApi('custom_fields/', 'delete', { purpose: 'deleteOne', match: { _id: req.body.customFieldId } })
          .then(fieldPayload => {
            require('./../../../config/socketio').sendMessageToClient({
              room_id: req.user.companyId,
              body: {
                action: 'custom_field_remove',
                payload: {
                  customFieldId: req.body.customFieldId
                }
              }
            })
            sendSuccessResponse(res, 200, '', 'Custom Field removed successfully')
          })
          .catch(err => {
            const message = err || 'Failed to remove custom field'
            logger.serverLog(message, `${TAG}: exports.delete`, req.body, {user: req.user}, 'error')
            sendErrorResponse(res, 500, '', `Failed to remove custom field ${err}`)
          })
      }
    })
    .catch(err => {
      const message = err || 'Failed to remove custom field subscriber'
      logger.serverLog(message, `${TAG}: exports.delete`, req.body, {user: req.user}, 'error')
      sendErrorResponse(res, 500, '', `Failed to find custom field subsriber${err}`)
    })
}

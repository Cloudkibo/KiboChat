// const logger = require('../../../components/logger')
// const CUSTOMFIELD = 'api/custom_field/custom_field.controller.js'
const callApi = require('../utility')
const { sendSuccessResponse, sendErrorResponse } = require('../../global/response')

exports.index = function (req, res) {
  callApi.callApi('companyuser/query', 'post', { domain_email: req.user.domain_email }, req.headers.authorization)
    .then(companyUser => {
      if (!companyUser) {
        sendErrorResponse(res, 404, '', 'The user account does not belong to any company. Please contact support')
      }
      callApi.callApi('custom_fields/query', 'post', { purpose: 'findAll', match: { companyId: companyUser.companyId } }, req.headers.authorization)
        .then(customFields => {
          sendSuccessResponse(res, 200, customFields)
        })
        .catch(err => {
          if (err) {
            sendErrorResponse(res, 500, '', `Internal Server Error in fetching customFields${JSON.stringify(err)}`)
          }
        })
    })
    .catch(err => {
      if (err) {
        sendErrorResponse(res, 500, '', `Internal Server Error in fetching customer${JSON.stringify(err)}`)
      }
    })
}

exports.create = function (req, res) {
  callApi.callApi('companyUser/query', 'post', { domain_email: req.user.domain_email }, req.headers.authorization)
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
      callApi.callApi('custom_fields/', 'post', customFieldPayload, req.headers.authorization)
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
          sendErrorResponse(res, 500, '', err.error.payload)
        })
    })
    .catch(err => {
      sendErrorResponse(res, 500, '', `Internal Server Error in fetching company user${JSON.stringify(err)}`)
    })
}

exports.update = function (req, res) {
  callApi.callApi('custom_fields/query', 'post', { purpose: 'findOne', match: { _id: req.body.customFieldId, companyId: req.user.companyId } }, req.headers.authorization)
    .then(fieldPayload => {
      if (!fieldPayload) {
        sendErrorResponse(res, 404, '', 'No Custom field is available on server with given customFieldId.')
      }
      let updatedPayload = {}
      if (req.body.updated.name) updatedPayload.name = req.body.updated.name
      if (req.body.updated.type) updatedPayload.type = req.body.updated.type
      if (req.body.updated.description) updatedPayload.description = req.body.updated.description
      if (req.user.companyId) updatedPayload.companyId = req.user.companyId
      callApi.callApi('custom_fields/', 'put', { purpose: 'updateOne', match: { _id: req.body.customFieldId }, updated: updatedPayload }, req.headers.authorization)
        .then(updated => {
          require('./../../../config/socketio').sendMessageToClient({
            room_id: fieldPayload.companyId._id,
            body: {
              action: 'tag_rename',
              payload: {
                fieldPayload
              }
            }
          })
          sendSuccessResponse(res, 200, updated)
        })
        .catch(err => {
          sendErrorResponse(res, 500, '', err)
        })
    })
    .catch(err => {
      sendErrorResponse(res, 500, '', `can not find custom field with given information${JSON.stringify(err)}`)
    })
}

exports.delete = function (req, res) {
  callApi.callApi('custom_field_subscribers/query', 'post', { purpose: 'findOne', match: { customFieldId: req.body.customFieldId } }, req.headers.authorization)
    .then(foundCustomField => {
      if (foundCustomField) {
        callApi.callApi('custom_field_subscribers/', 'delete', { purpose: 'deleteMany', match: { customFieldId: req.body.customFieldId } }, req.headers.authorization)
          .then(() => {
            callApi.callApi('custom_fields/', 'delete', { purpose: 'deleteOne', match: { _id: req.body.customFieldId } }, req.headers.authorization)
              .then(fieldPayload => {
                require('./../../../config/socketio').sendMessageToClient({
                  room_id: fieldPayload.companyId,
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
                sendErrorResponse(res, 500, '', `Failed to remove custom field ${err}`)
              })
          })
          .catch(err => {
            sendErrorResponse(res, 500, `Failed to remove custom field subscriber${err}`)
          })
      } else {
        callApi.callApi('custom_fields/', 'delete', { purpose: 'deleteOne', match: { _id: req.body.customFieldId } }, req.headers.authorization)
          .then(fieldPayload => {
            require('./../../../config/socketio').sendMessageToClient({
              room_id: fieldPayload.companyId,
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
            sendErrorResponse(res, 500, '', `Failed to remove custom field ${err}`)
          })
      }
    })
    .catch(err => {
      sendErrorResponse(res, 500, '', `Failed to find custom field subsriber${err}`)
    })
}

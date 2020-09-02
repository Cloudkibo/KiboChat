const logger = require('../../../components/logger')
const CUSTOMFIELD = 'api/custom_field/custom_field.controller.js'
const callApi = require('../utility')
const { sendErrorResponse, sendSuccessResponse } = require('../../global/response')
const { updateCompanyUsage } = require('../../global/billingPricing')

exports.index = function (req, res) {
  callApi.callApi('companyuser/query', 'post', { domain_email: req.user.domain_email })
    .then(companyUser => {
      if (!companyUser) {
        sendErrorResponse(res, 404, '', 'The user account does not belong to any company. Please contact support')
      }
      callApi.callApi('custom_fields/query', 'post', { purpose: 'findAll', match: { $or: [{companyId: companyUser.companyId}, {default: true}] } })
        .then(customFields => {
          logger.serverLog(CUSTOMFIELD, `got custom fields ${JSON.stringify(customFields)}`, 'debug')
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
  callApi.callApi(`featureUsage/planQuery`, 'post', {planId: req.user.currentPlan})
    .then(planUsage => {
      planUsage = planUsage[0]
      callApi.callApi(`featureUsage/companyQuery`, 'post', {companyId: req.user.companyId})
        .then(companyUsage => {
          companyUsage = companyUsage[0]
          if (planUsage.custom_fields !== -1 && companyUsage.custom_fields >= planUsage.custom_fields) {
            return res.status(500).json({
              status: 'failed',
              description: `Your custom fields limit has reached. Please upgrade your plan to create more custom fields.`
            })
          } else {
            let customFieldPayload = {
              name: req.body.name,
              type: req.body.type,
              description: req.body.description,
              companyId: req.user.companyId,
              createdBy: req.user._id
            }
            callApi.callApi('custom_fields/', 'post', customFieldPayload)
              .then(newCustomField => {
                updateCompanyUsage(req.user.companyId, 'custom_fields', 1)
                logger.serverLog(CUSTOMFIELD, `created custom fields ${JSON.stringify(newCustomField)}`)
                require('./../../../config/socketio').sendMessageToClient({
                  room_id: req.user.companyId,
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
                sendErrorResponse(res, 500, '', err)
              })
          }
        })
        .catch(err => {
          sendErrorResponse(res, 500, '', `Internal Server Error in fetching company usage ${JSON.stringify(err)}`)
        })
    })
    .catch(err => {
      sendErrorResponse(res, 500, '', `Internal Server Error in fetching plan usage ${JSON.stringify(err)}`)
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
          sendErrorResponse(res, 500, '', err)
        })
    })
    .catch(err => {
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
                updateCompanyUsage(req.user.companyId, 'custom_fields', -1)
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
                sendErrorResponse(res, 500, '', `Failed to remove custom field ${err}`)
              })
          })
          .catch(err => {
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
            sendErrorResponse(res, 500, '', `Failed to remove custom field ${err}`)
          })
      }
    })
    .catch(err => {
      sendErrorResponse(res, 500, '', `Failed to find custom field subsriber${err}`)
    })
}

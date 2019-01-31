// const logger = require('../../../components/logger')
// const CUSTOMFIELD = 'api/custom_field/custom_field.controller.js'
const callApi = require('../utility')

exports.index = function (req, res) {
  callApi.callApi('companyuser/query', 'post', { domain_email: req.user.domain_email }, req.headers.authorization)
    .then(companyUser => {
      if (!companyUser) {
        return res.status(404).json({
          status: 'failed',
          description: 'The user account does not belong to any company. Please contact support'
        })
      }
      callApi.callApi('custom_fields/query', 'post', {purpose: 'findAll', match: { companyId: companyUser.companyId }}, req.headers.authorization)
        .then(customFields => {
          res.status(200).json({ status: 'success', payload: customFields })
        })
        .catch(err => {
          if (err) {
            return res.status(500).json({
              status: 'failed',
              description: `Internal Server Error in fetching customFields${JSON.stringify(err)}`
            })
          }
        })
    })
    .catch(err => {
      if (err) {
        return res.status(500).json({
          status: 'failed',
          description: `Internal Server Error in fetching customer${JSON.stringify(err)}`
        })
      }
    })
}

exports.create = function (req, res) {
  callApi.callApi('companyUser/query', 'post', { domain_email: req.user.domain_email }, req.headers.authorization)
    .then(companyUser => {
      if (!companyUser) {
        return res.status(404).json({
          status: 'failed',
          description: 'The user account does not belong to any company. Please contact support'
        })
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
          return res.status(201).json({ status: 'success', payload: newCustomField })
        })
        .catch(err => {
          return res.status(500).json({
            status: 'failed',
            description: err
          })
        })
    })
    .catch(err => {
      return res.status(500).json({
        status: 'failed',
        description: `Internal Server Error in fetching company user${JSON.stringify(err)}`
      })
    })
}

exports.update = function (req, res) {
  callApi.callApi('custom_fields/query', 'post', { purpose: 'findOne', match: { _id: req.body.customFieldId } }, req.headers.authorization)
    .then(fieldPayload => {
      if (!fieldPayload) {
        return res.status(404).json({
          status: 'failed',
          description: 'No Custom field is available on server with given customFieldId.'
        })
      }
      if (req.body.name) fieldPayload.name = req.body.name
      if (req.body.type) fieldPayload.type = req.body.type
      if (req.body.description) fieldPayload.description = req.body.description
      callApi.callApi('custom_fields/', 'put', { purpose: 'updateOne', match: { _id: req.body.customFieldId }, updated: fieldPayload }, req.headers.authorization)
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
          return res.status(200).json({status: 'success', payload: updated})
        })
        .catch(err => {
          return res.status(500).json({
            status: 'failed',
            description: `Internal Server Error in saving Tags${JSON.stringify(err)}`
          })
        })
    })
    .catch(err => {
      return res.status(500).json({
        status: 'failed',
        description: `Internal Server Error in saving custom fields${JSON.stringify(err)}`
      })
    })
}

exports.delete = function (req, res) {
  callApi.callApi('custom_field_subscribers/', 'delete', {purpose: 'deleteMany', match: {customFieldId: req.body.customFieldId}}, req.headers.authorization)
    .then(() => {
      callApi.callApi('custom_fields/', 'post', {purpose: 'deleteOne', match: {_id: req.body.customFieldId}})
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
          return res.status(200)
            .json({status: 'success', description: 'Custom Field removed successfully'})
        })
        .catch(err => {
          return res.status(404).json({
            status: 'failed',
            description: `Failed to remove custom field ${err}`
          })
        })
    })
    .catch(err => {
      return res.status(404).json({
        status: 'failed',
        description: `Failed to remove custom field subscriber${err}`
      })
    })
}

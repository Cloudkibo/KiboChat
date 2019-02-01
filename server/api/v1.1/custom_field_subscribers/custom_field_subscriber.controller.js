// const logger = require('../../../components/logger')
// const CUSTOMFIELD = 'api/custom_field/custom_field.controller.js'
const callApi = require('../utility')

exports.setCustomFieldValue = function (req, res) {
  callApi.callApi('custom_fields/query', 'post', { purpose: 'findOne', match: {_id: req.body.customFieldId} }, req.headers.authorization)
    .then(foundCustomField => {
      callApi.callApi(`subscribers/${req.body.subscriberId}`, 'get', {}, req.headers.authorization)
        .then(foundSubscriber => {
          let subscribepayload = {
            customFieldId: req.body.customFieldId,
            subscriberId: req.body.subscriberId,
            value: req.body.value
          }
          callApi.callApi('custom_field_subscribers/query', 'post', {purpose: 'findOne',
            match: {customFieldId: req.body.customFieldId, subscriberId: req.body.subscriberId}},
          req.headers.authorization)
            .then(found => {
              if (!found) {
                callApi.callApi('custom_field_subscribers/', 'post', subscribepayload, req.headers.authorization)
                  .then(created => {
                    return res.status(200).json({
                      status: 'created',
                      payload: created
                    })
                  })
                  .catch(err => {
                    return res.status(500).json({
                      status: 'failed',
                      description: `internal server error in creating subscriber${JSON.stringify(err)}`
                    })
                  })
              } else {
                callApi.callApi('custom_field_subscribers/', 'put',
                  {purpose: 'updateOne', match: {customFieldId: req.body.customFieldId, subscriberId: req.body.subscriberId}, updated: {value: req.body.value}},
                  req.headers.authorization)
                  .then(updated => {
                    return res.status(200).json({
                      status: 'updated',
                      payload: updated
                    })
                  })
                  .catch(err => {
                    return res.status(500).json({
                      status: 'failed',
                      description: `can not update custom field subscriber value${JSON.stringify(err)}`
                    })
                  })
              }
            })
            .catch(err => {
              return res.status(500).json({
                status: 'failed',
                description: `internal server error finding custom field subscriber${JSON.stringify(err)}`
              })
            })
        })
        .catch(err => {
          return res.status(500).json({
            status: 'failed',
            description: `subscriber does not exist with the given id${JSON.stringify(err)}`
          })
        })
    })
    .catch(err => {
      return res.status(500).json({
        status: 'failed',
        description: `custom Field does not exist with the given id${JSON.stringify(err)}`
      })
    })
}

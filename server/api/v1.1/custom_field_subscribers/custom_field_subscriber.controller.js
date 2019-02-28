// const logger = require('../../../components/logger')
// const CUSTOMFIELD = 'api/custom_field/custom_field.controller.js'
const callApi = require('../utility')
const logger = require('../../../components/logger')
const customField = '/api/v1.1/custom_field_subscribers/custom_field_subscriber.controller.js'
const util = require('util')

exports.setCustomFieldValue = function (req, res) {
  let customFieldResponse = callApi.callApi(
    'custom_fields/query', 'post',
    { purpose: 'findOne', match: { _id: req.body.customFieldId, companyId: req.user.companyId } },
    req.headers.authorization
  )
  let foundSubscriberResponse = (subscriberId) => callApi.callApi(
    `subscribers/${subscriberId}`,
    'get',
    {},
    req.headers.authorization
  )
  let customFieldSubscribersRespons = (subscriberId) => callApi.callApi(
    'custom_field_subscribers/query', 'post',
    { purpose: 'findOne', match: { customFieldId: req.body.customFieldId, subscriberId: subscriberId } },
    req.headers.authorization
  )

  customFieldResponse.then(foundCustomField => {
    logger.serverLog(customField, `Custom Field ${util.inspect(foundCustomField)}`)
    if (!foundCustomField) return new Promise((resolve, reject) => { reject(new Error('Custom Field Not Found With Given ID')) })
    else {
      req.body.subscriberIds.forEach((subscriberId, index) => {
        foundSubscriberResponse(subscriberId)
          .then(foundSubscriber => {
            logger.serverLog(customField, `found subscriber of a page ${util.inspect(foundSubscriber)}`)
            if (!foundSubscriber) return new Promise((resolve, reject) => { reject(new Error('Subscriber Not Found With Given ID')) })
            else return customFieldSubscribersRespons(subscriberId)
          })
          .then(foundCustomFieldSubscriber => {
            logger.serverLog(customField, `Custom Field subscriber ${util.inspect(foundCustomFieldSubscriber)}`)
            let subscribepayload = {
              customFieldId: req.body.customFieldId,
              subscriberId: subscriberId,
              value: req.body.value
            }
            if (!foundCustomFieldSubscriber) {
              return callApi.callApi('custom_field_subscribers/', 'post', subscribepayload, req.headers.authorization)
            } else {
              return callApi.callApi('custom_field_subscribers/', 'put',
                { purpose: 'updateOne', match: { customFieldId: req.body.customFieldId, subscriberId: subscriberId }, updated: { value: req.body.value } },
                req.headers.authorization)
            }
          })
          .then(setCustomFieldValue => {
            logger.serverLog(customField, `set custom field value for subscriber ${util.inspect(setCustomFieldValue)}`)
            require('./../../../config/socketio').sendMessageToClient({
              room_id: req.user.companyId,
              body: {
                action: 'set_custom_field_value',
                payload: {
                  setCustomField: setCustomFieldValue
                }
              }
            })
            if (index === req.body.subscriberIds.length - 1) {
              return res.status(200).json({
                status: 'Success',
                payload: setCustomFieldValue
              })
            }
          })
          .catch(err => {
            return res.status(500).json({
              status: 'Failed',
              description: `Internal Server ${(err)}`
            })
          })
      })
    }
  })
    .catch(err => {
      return res.status(500).json({
        status: 'Failed',
        description: `Internal Server ${(err)}`
      })
    })
}

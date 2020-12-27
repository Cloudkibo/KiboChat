/**
 * Created by sojharo on 27/07/2017.
 */

const logger = require('../../../../components/logger')
const TAG = 'api/v1.1/messenger_components/api/api.controller.js'
const DataLayer = require('./../messenger_components.datalayer')
const { callApi } = require('./../../utility')
const { sendSuccessResponse, sendErrorResponse } = require('../../../global/response')
const base64url = require('base64url')

// Expected value in req.body from Messenger
// Plugin
//
// {
//   'thread_type': 'GROUP',
//   'tid': '1411911565550430',
//   'psid': '1293479104029354',
//   'signed_request': '<signed token from fb>'
// }
exports.subscriberInfo = async function (req, res) {
  try {
    const [encodedSign, payload] = req.body.signed_request.split('.')
    const signature = await base64url.decode(encodedSign)
    const data = await base64url.decode(payload)
    const dataPayload = JSON.parse(data)
    const pageId = dataPayload.page_id
    const senderId = dataPayload.psid
    callApi('pages/query', 'post', { connected: true, pageId })
      .then(page => {
        if (page.length > 0) {
          return callApi('subscribers/query', 'post', { pageId: page[0]._id, senderId })
        } else {
          sendErrorResponse(res, 404, null, 'Page for this subscriber not found')
        }
      })
      .then(subscriber => {
        if (subscriber.length > 0) {
          sendSuccessResponse(res, 200, subscriber[0], null)
        } else {
          sendErrorResponse(res, 404, null, 'Subscriber not found')
        }
      })
      .catch(err => {
        sendErrorResponse(res, 500, err, 'error in catch of page Info')
      })
  } catch (err) {
    sendErrorResponse(res, 500, err, 'error in catch of subscriber Info')
  }
}

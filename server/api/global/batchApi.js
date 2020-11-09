const logger = require('../../components/logger')
const TAG = 'global/batchApi.js'
const request = require('request')
const prepareMessageData = require('./prepareMessageData')

const sendMessages = (subscriber, payload, page) => {
  let batch = _prepareBatchData(subscriber, payload, page)
  return _callBatchAPI(JSON.stringify(batch), page.accessToken)
}

const _callBatchAPI = (batch, accessToken) => {
  return new Promise((resolve, reject) => {
    const r = request.post('https://graph.facebook.com', (err, httpResponse, body) => {
      if (err) {
        const message = err || 'Batch api error'
        logger.serverLog(message, `${TAG}: exports._callBatchApi`, body, {}, 'error')
      } else {
        body = JSON.parse(body)
        resolve(body)
      }
    })
    const form = r.form()
    form.append('access_token', accessToken)
    form.append('batch', batch)
  })
}

/* eslint-disable */
const _prepareBatchData = (subscriber, payload, page) => {
  let batch = []
  let recipient = "recipient=" + encodeURIComponent(JSON.stringify({"id": subscriber.senderId}))
  let tag = "tag=" + encodeURIComponent("NON_PROMOTIONAL_SUBSCRIPTION")
  let messagingType = "messaging_type=" + encodeURIComponent("MESSAGE_TAG")
  payload.forEach((item, index) => {
    let message = "message=" + encodeURIComponent(prepareMessageData.facebook(item, subscriber.firstName, subscriber.lastName))
    if (index === 0) {
      batch.push({ "method": "POST", "name": `${subscriber.senderId}${index + 1}`, "relative_url": "v4.0/me/messages", "body": recipient + "&" + message + "&" + messagingType +  "&" + tag })
    } else {
      batch.push({ "method": "POST", "name": `${subscriber.senderId}${index + 1}`, "depends_on": `${subscriber.senderId}${index}`, "relative_url": "v4.0/me/messages", "body": recipient + "&" + message + "&" + messagingType +  "&" + tag })
    }
  })
  return batch
}
/* eslint-enable */

exports.sendMessages = sendMessages

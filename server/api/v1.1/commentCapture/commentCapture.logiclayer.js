/*
This file will contain the functions for logic layer.
By separating it from controller, we are separating the concerns.
Thus we can use it from other non express callers like cron etc
*/

exports.setMessage = function (payload) {
  let messageData = {}
  payload.map(payloadItem => {
    if (payloadItem.componentType === 'text') {
      messageData.message = payloadItem.text
    } else if (payloadItem.componentType === 'image') {
      messageData.image = true
      messageData.url = payloadItem.url
    } else if (payloadItem.componentType === 'video') {
      messageData.description = messageData.message
      messageData.video = true
      messageData.file_url = payloadItem.url
    }
  })
  return messageData
}

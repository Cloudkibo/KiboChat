const config = require('../../config/environment/index')
var path = require('path')

exports.prepareSendMessagePayload = (body) => {
  let MessageObject = {
    from: `whatsapp:${body.whatsApp.businessNumber}`,
    to: `whatsapp:${body.recipientNumber}`,
    statusCallback: `${config.api_urls['webhook']}/webhooks/twilio`
  }
  if (body.payload.componentType !== 'text') {
    MessageObject.mediaUrl = body.payload.fileurl.url || body.payload.fileurl
    if (body.payload.componentType === 'file') {
      let ext = path.extname(body.payload.fileName)
      if (ext !== '') {
        body.payload.fileName = body.payload.fileName.replace(ext, '')
      }
      MessageObject.body = body.payload.fileName
    }
  } else {
    MessageObject.body = body.payload.text
  }
  return MessageObject
}

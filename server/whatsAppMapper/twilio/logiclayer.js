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
exports.prepareInvitationPayload = (body, number) => {
  let MessageObject = {
    body: body.payload.text,
    from: `whatsapp:${body.whatsApp.businessNumber}`,
    to: `whatsapp:${number}`,
    statusCallback: `${config.api_urls['webhook']}/webhooks/twilio`
  }
  return MessageObject
}
exports.prepareTemplates = () => {
  let templates = [
    {
      name: 'registration_code',
      text: 'Your {{1}} code is {{2}}',
      templateArguments: '{{1}},{{2}}',
      regex: '^Your (.*) code is (.*)$',
      buttons: []
    },
    {
      name: 'appointment_reminder',
      text: 'Your appointment is coming up on {{1}} at {{2}}',
      templateArguments: '{{1}},{{2}}',
      regex: '^Your appointment is coming up on (.*) at (.*)$',
      buttons: []
    },
    {
      name: 'order_update',
      text: 'Your {{1}} order of {{2}} has shipped and should be delivered on {{3}}. Details: {{4}}',
      templateArguments: '{{1}},{{2}},{{3}},{{4}}',
      regex: '^Your (.*) order of (.*) has shipped and should be delivered on (.*). Details: (.*)$',
      buttons: []
    }
  ]
  return templates
}

const config = require('../../config/environment/index')
var path = require('path')
const { appendOptions } = require('../logiclayer')

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
      type: 'TEXT',
      name: 'registration_code',
      text: 'Your {{1}} code is {{2}}',
      templateArguments: '{{1}},{{2}}',
      regex: '^Your (.*) code is (.*)$',
      buttons: []
    },
    {
      type: 'TEXT',
      name: 'appointment_reminder',
      text: 'Your appointment is coming up on {{1}} at {{2}}',
      templateArguments: '{{1}},{{2}}',
      regex: '^Your appointment is coming up on (.*) at (.*)$',
      buttons: []
    },
    {
      type: 'TEXT',
      name: 'order_update',
      text: 'Your {{1}} order of {{2}} has shipped and should be delivered on {{3}}. Details: {{4}}',
      templateArguments: '{{1}},{{2}},{{3}},{{4}}',
      regex: '^Your (.*) order of (.*) has shipped and should be delivered on (.*). Details: (.*)$',
      buttons: []
    }
  ]
  return templates
}

exports.prepareReceivedMessageData = (event) => {
  let payload = {}
  if ((event.NumMedia === '0' || !event.MediaContentType0) && event.Body !== '') { // text only
    payload = { componentType: 'text', text: event.Body }
  } else if (event.MediaContentType0) {
    if (event.NumMedia !== '0' && event.Body !== '' && event.MediaContentType0.includes('image')) { // text with media
      payload = { componentType: 'text', text: event.Body }
      payload = { componentType: 'image', fileurl: { url: event.MediaUrl0 } }
    } else if (event.NumMedia !== '0' && event.Body !== '' && event.MediaContentType0.includes('video')) { // text with media
      payload = { componentType: 'text', text: event.Body }
      payload = { componentType: 'video', fileurl: { url: event.MediaUrl0 } }
    } else if (event.NumMedia !== '0') { // media only
      if (event.MediaContentType0.includes('image')) {
        payload = { componentType: 'image', fileurl: { url: event.MediaUrl0 } }
      } else if (event.MediaContentType0.includes('pdf')) {
        payload = { componentType: 'file', fileurl: { url: event.MediaUrl0 }, fileName: event.Body }
      } else if (event.MediaContentType0.includes('audio')) {
        payload = { componentType: 'audio', fileurl: { url: event.MediaUrl0 } }
      } else if (event.MediaContentType0.includes('video')) {
        payload = { componentType: 'video', fileurl: { url: event.MediaUrl0 } }
      } else if (event.MediaContentType0.includes('vcard')) {
        payload = { componentType: 'file', fileurl: { url: event.MediaUrl0 }, fileName: 'Contact Card' }
      }
    }
  } else if (event.Latitude && event.Longitude) {
    payload = {
      componentType: 'location',
      title: 'Pinned Location',
      payload: {
        coordinates: { lat: event.Latitude, long: event.Longitude }
      }
    }
  }
  return payload
}

exports.prepareChatbotPayload = (company, contact, payload, options) => {
  return new Promise((resolve, reject) => {
    console.log(payload)
    let message = {
      from: `whatsapp:${company.whatsApp.businessNumber}`,
      to: `whatsapp:${contact.number}`,
      statusCallback: `${config.api_urls['webhook']}/webhooks/twilio`
    }
    if (payload.componentType === 'text') {
      message.body = payload.text + appendOptions(options)
    } else if (['image', 'file', 'audio', 'video', 'media'].includes(payload.componentType)) {
      message.mediaUrl = payload.fileurl.url
      message.body = (payload.caption) ? payload.caption : undefined
    } else if (payload.componentType === 'card') {
      message.body = payload.url
    }
    resolve(message)
  })
}

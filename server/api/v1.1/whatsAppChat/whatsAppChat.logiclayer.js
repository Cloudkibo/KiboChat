let config = require('./../../../config/environment')
var path = require('path')

exports.prepareChat = (body, companyId, whatsApp) => {
  let MessageObject = {
    senderNumber: whatsApp.businessNumber,
    recipientNumber: body.recipientNumber,
    contactId: body.contactId,
    companyId: companyId,
    payload: body.payload,
    repliedBy: body.repliedBy
  }
  if (body.url_meta) {
    MessageObject.url_meta = body.url_meta
  }
  return MessageObject
}
exports.prepareSendMessagePayload = (body, companyUser, message) => {
  let MessageObject = {
    from: `whatsapp:${companyUser.companyId.twilioWhatsApp.sandboxNumber}`,
    to: `whatsapp:${body.recipientNumber}`
    // statusCallback: `http://${config.domain}/webhooks/twilio/trackStatusWhatsAppChat/${message._id}`
    // statusCallback: `https://kibopush-anisha.ngrok.io/webhooks/twilio/trackStatusWhatsAppChat/${message._id}`

  }
  if (config.env === 'staging') {
    MessageObject.statusCallback = `https://swebhook.cloudkibo.com/webhooks/twilio/trackStatusWhatsAppChat/${message._id}`
  } else {
    MessageObject.statusCallback = `https://webhook.cloudkibo.com/webhooks/twilio/trackStatusWhatsAppChat/${message._id}`
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

exports.prepareFlockSendPayload = (body, companyUser, message) => {
  let route = ''
  let MessageObject = {
    token: companyUser.companyId.flockSendWhatsApp.accessToken,
    number_details: JSON.stringify([
      {phone: body.recipientNumber}])
  }
  if (body.payload.componentType === 'text') {
    if (body.payload.templateName) {
      MessageObject.template_name = body.payload.templateName
      MessageObject.template_argument = body.payload.templateArguments
      MessageObject.language = 'en'
      route = 'hsm'
    } else {
      MessageObject.message = body.payload.text
      route = 'text'
    }
  } else if (body.payload.componentType === 'sticker' ||
    body.payload.componentType === 'image' ||
    body.payload.componentType === 'thumbsUp') {
    MessageObject.image = body.payload.fileurl.url || body.payload.fileurl
    MessageObject.title = body.payload.caption
    route = 'image'
  } else if (body.payload.componentType === 'video' || body.payload.componentType === 'gif') {
    MessageObject.video = body.payload.fileurl.url || body.payload.fileurl
    MessageObject.title = body.payload.caption
    route = 'video'
  } else if (body.payload.componentType === 'file') {
    let ext = path.extname(body.payload.fileName)
    if (ext !== '') {
      body.payload.fileName = body.payload.fileName.replace(ext, '')
    }
    MessageObject.title = body.payload.fileName
    MessageObject.file = body.payload.fileurl.url || body.payload.fileurl
    route = 'file'
  } else if (body.payload.componentType === 'audio') {
    let ext = path.extname(body.payload.fileName)
    if (ext !== '') {
      body.payload.fileName = body.payload.fileName.replace(ext, '')
    }
    MessageObject.audio = body.payload.fileurl.url || body.payload.fileurl
    MessageObject.title = body.payload.fileName
    route = 'audio'
  }
  return {
    MessageObject,
    route
  }
}

exports.getQueryData = (type, purpose, match, skip, sort, limit, group) => {
  if (type === 'count') {
    return {
      purpose,
      match,
      group: { _id: null, count: { $sum: 1 } }
    }
  } else {
    return {
      purpose,
      match,
      group,
      skip,
      sort,
      limit
    }
  }
}

exports.setChatProperties = (fbchats) => {
  for (var i = 0; i < fbchats.length; i++) {
    fbchats[i].lastPayload = fbchats[fbchats.length - 1].payload
    fbchats[i].lastRepliedBy = fbchats[fbchats.length - 1].repliedBy
    fbchats[i].lastDateTime = fbchats[fbchats.length - 1].datetime
  }
  return fbchats
}

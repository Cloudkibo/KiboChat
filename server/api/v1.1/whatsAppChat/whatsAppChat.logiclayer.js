let config = require('./../../../config/environment')

exports.prepareChat = (body, companyUser) => {
  let MessageObject = {
    senderNumber: body.recipientNumber,
    recipientNumber: companyUser.companyId.twilioWhatsApp.sandboxNumber,
    contactId: body.contactId,
    companyId: companyUser.companyId._id,
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
      MessageObject.body = body.payload.fileName
    }
  } else {
    MessageObject.body = body.payload.text
  }
  return MessageObject
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

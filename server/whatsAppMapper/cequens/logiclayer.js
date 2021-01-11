var path = require('path')

exports.prepareSendMessagePayload = (body) => {
  let MessageObject = {
    to: body.whatsAppId,
    recipient_type: 'individual'
  }
  if (body.payload.componentType === 'text') {
    // to do
    if (body.payload.templateName) {
      MessageObject.template_name = body.payload.templateName
      MessageObject.template_argument = body.payload.templateArguments
      MessageObject.language = 'en'
    } else {
      MessageObject.type = 'text'
      MessageObject['text'] = {
        body: body.payload.text
      }
    }
  } else if (body.payload.componentType === 'sticker' ||
    body.payload.componentType === 'image' ||
    body.payload.componentType === 'thumbsUp') {
    MessageObject.type = 'image'
    MessageObject['image'] = {
      link: body.payload.fileurl.url || body.payload.fileurl,
      caption: body.payload.caption
    }
  } else if (body.payload.componentType === 'video' || body.payload.componentType === 'gif') {
    MessageObject.type = 'video'
    MessageObject['video'] = {
      link: body.payload.fileurl.url || body.payload.fileurl,
      caption: body.payload.caption
    }
  } else if (body.payload.componentType === 'file') {
    let ext = path.extname(body.payload.fileName)
    if (ext !== '') {
      body.payload.fileName = body.payload.fileName.replace(ext, '')
    }
    MessageObject.type = 'document'
    MessageObject['document'] = {
      link: body.payload.fileurl.url || body.payload.fileurl,
      caption: body.payload.fileName
    }
  } else if (body.payload.componentType === 'audio') {
    MessageObject.type = 'audio'
    MessageObject['audio'] = {
      link: body.payload.fileurl.url || body.payload.fileurl
    }
  }
  return MessageObject
}

var path = require('path')

exports.prepareSendMessagePayload = (body) => {
  let route = ''
  let MessageObject = {
    token: body.whatsApp.accessToken,
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


exports.prepareSendMessagePayload = (body) => {
  let from = body.whatsApp.businessNumber.replace(/\D/g, '')
  let to = body.recipientNumber.replace(/\D/g, '')
  let appName = body.whatsApp.appName
  let componentType = body.payload.componentType
  let MessageObject = `channel=whatsapp&source=${from}&destination=${to}&src.name=${appName}`
  if (componentType === 'text') {
    if (body.payload.templateName) {
      MessageObject.template_name = body.payload.templateName
      MessageObject.template_argument = body.payload.templateArguments
      MessageObject.language = 'en'
    } else {
      MessageObject = MessageObject + `&message.type=text&message.text=${body.payload.text}`
    }
  } else {
    let message
    if (componentType === 'sticker') {
      let url = body.payload.fileurl.url || body.payload.fileurl
      message = JSON.stringify({
        type: 'sticker',
        url: url.split('?')[0]
      })
    } else if (componentType === 'image') {
      let url = body.payload.fileurl.url || body.payload.fileurl
      message = JSON.stringify({
        type: 'image',
        originalUrl: url,
        previewUrl: url,
        caption: body.payload.caption
      })
    } else if (componentType === 'video' || componentType === 'gif') {
      message = JSON.stringify({
        type: 'video',
        url: body.payload.fileurl.url || body.payload.fileurl,
        caption: body.payload.caption
      })
    } else if (componentType === 'file') {
      message = JSON.stringify({
        type: 'file',
        url: body.payload.fileurl.url || body.payload.fileurl,
        filename: body.payload.fileName
      })
    } else if (componentType === 'audio') {
      message = JSON.stringify({
        type: 'audio',
        url: body.payload.fileurl.url || body.payload.fileurl
      })
    }
    MessageObject = MessageObject + `&message=${message}`
  }
  return MessageObject
}


exports.prepareSendMessagePayload = (body) => {
  let route = 'msg'
  let from = body.whatsApp.businessNumber.replace(/\D/g, '')
  let to = body.recipientNumber.replace(/\D/g, '')
  let appName = body.whatsApp.appName
  let componentType = body.payload.componentType
  let MessageObject = `channel=whatsapp&source=${from}&destination=${to}&src.name=${appName}`
  if (componentType === 'text') {
    if (body.payload.templateName) {
      let templateArguments = body.payload.templateArguments.split(',')
      let message = JSON.stringify({
        id: body.payload.templateId,
        params: templateArguments
      })
      route = 'template/msg'
      MessageObject = MessageObject + `&template=${message}`
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
  return {MessageObject, route}
}
exports.prepareTemplates = (gupshupTemplates) => {
  let templates = []
  for (let i = 0; i < gupshupTemplates.length; i++) {
    if (gupshupTemplates[i].status === 'APPROVED' || gupshupTemplates[i].status === 'SANDBOX_REQUESTED') {
      let template = {}
      template.code = gupshupTemplates[i].languageCode
      template.id = gupshupTemplates[i].id
      template.name = gupshupTemplates[i].elementName
      template.text = gupshupTemplates[i].data
      let argumentsRegex = /{{[0-9]}}/g
      let templateArguments = template.text.match(argumentsRegex) ? template.text.match(argumentsRegex).join(',') : ''
      template.templateArguments = templateArguments
      let regex = template.text.replace('.', '\\.')
      regex = regex.replace(argumentsRegex, '(.*)')
      template.regex = `^${regex}$`
      if (!template.buttons) {
        template.buttons = []
      }
      templates.push(template)
    }
  }
  return templates
}
exports.prepareInvitationPayload = (body, number) => {
  let templateArguments = body.payload.templateArguments.split(',')
  let from = body.whatsApp.businessNumber.replace(/\D/g, '')
  let to = number.replace(/\D/g, '')
  let appName = body.whatsApp.appName
  let MessageObject = `channel=whatsapp&source=${from}&destination=${to}&src.name=${appName}`
  let message = JSON.stringify({
    id: body.payload.templateId,
    params: templateArguments
  })
  MessageObject = MessageObject + `&template=${message}`
  return MessageObject
}

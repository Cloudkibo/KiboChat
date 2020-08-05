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
exports.prepareTemplates = (flockSendTemplates) => {
  let templates = []
  for (let i = 0; i < flockSendTemplates.length; i++) {
    if (flockSendTemplates[i].localizations[0].status === 'APPROVED') {
      let template = {}
      template.name = flockSendTemplates[i].templateName
      let templateComponents = flockSendTemplates[i].localizations[0].components
      for (let j = 0; j < templateComponents.length; j++) {
        if (templateComponents[j].type === 'BODY') {
          template.text = templateComponents[j].text
          let argumentsRegex = /{{[0-9]}}/g
          let templateArguments = template.text.match(argumentsRegex).join(',')
          template.templateArguments = templateArguments
          let regex = template.text.replace('.', '\\.')
          regex = regex.replace(argumentsRegex, '(.*)')
          template.regex = `^${regex}$`
        } else if (templateComponents[j].type === 'BUTTONS') {
          template.buttons = templateComponents[j].buttons.map(button => {
            return {
              title: button.text
            }
          })
        }
      }
      if (!template.buttons) {
        template.buttons = []
      }
      templates.push(template)
    }
  }
  return templates
}
exports.prepareInvitationPayload = (data) => {
  let MessageObject = {
    token: data.whatsApp.accessToken,
    number_details: JSON.stringify(data.numbers),
    template_name: data.payload.templateName,
    template_argument: data.payload.templateArguments,
    language: 'en'
  }
  return MessageObject
}

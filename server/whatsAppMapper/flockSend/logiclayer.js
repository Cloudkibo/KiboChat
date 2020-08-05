var path = require('path')

exports.prepareSendMessagePayload = (body) => {
  let route = ''
  let MessageObject = {
    token: body.whatsApp.accessToken,
    number_details: JSON.stringify([
      { phone: body.recipientNumber }])
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

exports.prepareReceiveMessageData = (event) => {
  let payload = {}
  if (event.media_type === 'image') {
    payload = { componentType: 'image', fileurl: { url: `https://flocksend.com${event.media_link}` } }
    if (event.message !== '' && event.message !== 'image') {
      payload.caption = event.message
    }
  } else if (event.media_type === 'video') {
    payload = { componentType: 'video', fileurl: { url: `https://flocksend.com${event.media_link}` } }
    if (event.message !== '' && event.message !== 'video') {
      payload.caption = event.message
    }
  } else if (event.media_type === 'document') {
    payload = {
      componentType: 'file',
      fileurl: { url: `https://flocksend.com${event.media_link}` },
      fileName: event.message
    }
  } else if (event.media_type === 'audio') {
    payload = { componentType: 'audio', fileurl: { url: `https://flocksend.com${event.media_link}` } }
  } else if (event.media_type === 'location') {
    let coordinates = event.message.split(':')
    payload = {
      componentType: 'location',
      title: 'Pinned Location',
      payload: {
        coordinates: { lat: coordinates[1], long: coordinates[0] }
      }
    }
  } else if (event.media_type === 'contacts') {
    let parsed = event.message.split(':')
    payload = { componentType: 'contact', name: parsed[0], number: parsed[1] }
  } else if (event.media_type === 'text' && event.message !== '') {
    payload = { componentType: 'text', text: event.message }
  }
  return payload
}

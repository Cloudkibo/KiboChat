var path = require('path')
const { appendOptions } = require('../logiclayer')
var mime = require('mime-types')
const fs = require('fs')
let config = require('../../config/environment')
const crypto = require('crypto')
const needle = require('needle')

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

exports.prepareReceivedMessageData = (body) => {
  let payload = {}
  return new Promise((resolve, reject) => {
    var media = ['image', 'video', 'audio', 'voice']
    var isMedia = media.includes(body.type)
    if (isMedia) {
      let ext = mime.extension(body.payload.contentType)
      uploadMedia(body.payload.url, body.payload.id + '.' + ext)
        .then(payload => {
          if (body.type === 'image') {
            payload = { componentType: 'image', fileurl: { url: payload.url } }
            if (body.payload.caption && body.payload.caption !== '') {
              payload.caption = body.payload.caption
            }
            resolve(payload)
          } else if (body.type === 'video') {
            payload = { componentType: 'video', fileurl: { url: payload.url } }
            if (body.payload.caption && body.payload.caption !== '') {
              payload.caption = body.payload.caption
            }
            resolve(payload)
          } else if (body.type === 'audio') {
            payload = { componentType: 'audio', fileurl: { url: payload.url } }
            if (body.payload.caption && body.payload.caption !== '') {
              payload.caption = body.payload.caption
            }
            resolve(payload)
          } else if (body.type === 'voice') {
            payload = { componentType: 'audio', fileurl: { url: payload.url } }
          } else if (body.type === 'document') {
            payload = { componentType: 'file', fileurl: { url: payload.url } }
            resolve(payload)
          }
        })
        .catch(err => {
          reject(err)
        })
    } else if (body.type === 'location') {
      payload = {
        componentType: 'location',
        title: 'Pinned Location',
        payload: {
          coordinates: { lat: body.payload.latitude, long: body.payload.longitude }
        }
      }
      resolve(payload)
    } else if (body.type === 'contact' && body.payload.contacts[0]) {
      payload = { componentType: 'contact',
        name: body.payload.contacts[0].name.formatted_name,
        number: body.contacts[0].phones[0].phone }
      resolve(payload)
    } else if (body.type === 'text' && body.payload.text !== '') {
      payload = { componentType: 'text', text: body.payload.text }
      resolve(payload)
    } else {
      resolve(payload)
    }
  })
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
  let contactNumbers = []
  data.numbers.map((c) => contactNumbers.push({ phone: c }))
  let MessageObject = {
    token: data.whatsApp.accessToken,
    number_details: JSON.stringify(contactNumbers),
    template_name: data.payload.templateName,
    template_argument: data.payload.templateArguments,
    language: 'en'
  }
  return MessageObject
}

exports.prepareChatbotPayload = (company, contact, payload, options) => {
  return new Promise((resolve, reject) => {
    let route = ''
    let message = {
      token: company.whatsApp.accessToken,
      number_details: JSON.stringify([{phone: contact.number}])
    }
    if (payload.componentType === 'text') {
      message.message = payload.text + appendOptions(options)
      route = 'text'
    } else if (payload.componentType === 'image' || payload.mediaType === 'image') {
      message.image = payload.fileurl.url
      message.title = (payload.caption) ? payload.caption : undefined
      route = 'image'
    } else if (payload.componentType === 'video' || payload.mediaType === 'video') {
      message.video = payload.fileurl.url
      route = 'video'
    } else if (payload.componentType === 'file') {
      message.file = payload.fileurl.url
      route = 'file'
    } else if (payload.componentType === 'audio') {
      message.audio = payload.fileurl.url
      route = 'audio'
    } else if (payload.componentType === 'card') {
      message.message = payload.url
      route = 'text'
    }
    resolve({message, route})
  })
}

const uploadMedia = function (filePath, fileName) {
  return new Promise((resolve, reject) => {
    var today = new Date()
    var uid = crypto.randomBytes(5).toString('hex')
    var serverPath = 'f' + uid + '' + today.getFullYear() + '' +
    (today.getMonth() + 1) + '' + today.getDate()
    serverPath += '' + today.getHours() + '' + today.getMinutes() + '' +
    today.getSeconds()
    let fext = fileName.split('.')
    serverPath += '.' + fext[fext.length - 1].toLowerCase()
    let dir = path.resolve(__dirname, '../../../broadcastFiles/')
    needle.get(filePath, (err, res) => {
      if (err) {
        reject(new Error(err))
      } else {
        if (res.body) {
          let blob = res.body
          fs.writeFile(dir + '/userfiles/' + serverPath, blob, (err) => {
            if (err) {
              reject(err)
            } else {
              let payload = {
                id: serverPath,
                name: fileName,
                url: `${config.domain}/api/broadcasts/download/${serverPath}`
              }
              resolve(payload)
            }
          })
        } else {
          reject(new Error('Blob not found'))
        }
      }
    })
  })
}

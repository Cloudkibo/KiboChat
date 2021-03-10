const { appendOptions } = require('../logiclayer')
var path = require('path')
var mime = require('mime-types')
const fs = require('fs')
let config = require('../../config/environment')
const crypto = require('crypto')
const needle = require('needle')

exports.prepareSendMessagePayload = (body) => {
  let route = 'msg'
  let from = body.whatsApp.businessNumber.replace(/\D/g, '')
  let to = body.recipientNumber.replace(/\D/g, '')
  let appName = body.whatsApp.appName
  let componentType = body.payload.componentType
  let MessageObject = `channel=whatsapp&source=${from}&destination=${to}&src.name=${appName}`
  if (body.payload.templateName) {
    let templateArguments = body.payload.templateArguments ? body.payload.templateArguments.split(',') : []
    let template = JSON.stringify({
      id: body.payload.templateId,
      params: templateArguments
    })
    route = 'template/msg'
    MessageObject = MessageObject + `&template=${template}`
    if (componentType !== 'text') {
      let type = body.payload.templateType.toLowerCase()
      let message = {type}
      message[type] = {
        link: body.payload.fileurl.url || body.payload.fileurl
      }
      if (componentType === 'file') {
        message[type].filename = body.payload.fileName
      }
      MessageObject = MessageObject + `&message=${JSON.stringify(message)}`
    }
  } else if (componentType === 'text') {
    MessageObject = MessageObject + `&message.type=text&message.text=${body.payload.text}`
  } else {
    let message
    let url = body.payload.fileurl.url || body.payload.fileurl
    if (componentType === 'sticker') {
      message = JSON.stringify({
        type: 'sticker',
        url: url.split('?')[0]
      })
    } else if (componentType === 'image') {
      message = JSON.stringify({
        type: 'image',
        originalUrl: url,
        previewUrl: url,
        caption: body.payload.caption
      })
    } else if (componentType === 'video' || componentType === 'gif') {
      message = JSON.stringify({
        type: 'video',
        url: url,
        caption: body.payload.caption
      })
    } else if (componentType === 'file') {
      message = JSON.stringify({
        type: 'file',
        url: url,
        filename: body.payload.fileName
      })
    } else if (componentType === 'audio') {
      message = JSON.stringify({
        type: 'audio',
        url: url
      })
    }
    MessageObject = MessageObject + `&message=${message}`
  }
  return {MessageObject, route}
}
exports.prepareTemplates = (gupshupTemplates) => {
  let templates = []
  for (let i = 0; i < gupshupTemplates.length; i++) {
    if (
      (gupshupTemplates[i].status === 'APPROVED' || gupshupTemplates[i].status === 'SANDBOX_REQUESTED') &&
      gupshupTemplates[i].templateType !== 'LOCATION'
    ) {
      let template = {}
      template.code = gupshupTemplates[i].languageCode
      template.type = gupshupTemplates[i].templateType
      template.vertical = gupshupTemplates[i].vertical
      template.id = gupshupTemplates[i].id
      template.name = gupshupTemplates[i].elementName
      template.text = gupshupTemplates[i].data
      let argumentsRegex = /{{[0-9]}}/g
      let templateArguments = template.text.match(argumentsRegex) ? template.text.match(argumentsRegex).join(',') : ''
      template.templateArguments = templateArguments
      let regex = template.text.replace('.', '\\.')
      regex = regex.replace(argumentsRegex, '(.*)')
      template.regex = `^${regex}$`
      template.buttons = getTemplateButtons(template)
      template.text = gupshupTemplates[i].data.split(' |')[0]
      templates.push(template)
    }
  }
  return templates
}

function getTemplateButtons (template) {
  let templateButtons = []
  if (template.vertical.includes('BUTTON')) {
    let buttons = template.text.split('|')
    for (let i = 1; i < buttons.length; i++) {
      let buttonText = buttons[i].replace('[', '').replace(']', '')
      templateButtons.push({title: buttonText.split(',')[0]})
    }
  }
  return templateButtons
}

exports.prepareInvitationPayload = (body, number) => {
  let templateArguments = body.payload.templateArguments ? body.payload.templateArguments.split(',') : []
  let from = body.whatsApp.businessNumber.replace(/\D/g, '')
  let to = number.replace(/\D/g, '')
  let appName = body.whatsApp.appName
  let MessageObject = `channel=whatsapp&source=${from}&destination=${to}&src.name=${appName}`
  let message = JSON.stringify({
    id: body.payload.templateId,
    params: templateArguments
  })
  MessageObject = MessageObject + `&template=${message}`
  if (body.payload.componentType !== 'text') {
    let type = body.payload.templateType.toLowerCase()
    let message = {type}
    message[type] = {
      link: body.payload.fileurl.url || body.payload.fileurl
    }
    if (body.payload.componentType === 'file') {
      message[type].filename = body.payload.fileName
    }
    MessageObject = MessageObject + `&message=${JSON.stringify(message)}`
  }
  return MessageObject
}
exports.prepareChatbotPayload = (company, contact, payload, options) => {
  return new Promise((resolve, reject) => {
    let from = company.whatsApp.businessNumber.replace(/\D/g, '')
    let to = contact.number.replace(/\D/g, '')
    let appName = company.whatsApp.appName
    let componentType = payload.componentType
    let MessageObject = `channel=whatsapp&source=${from}&destination=${to}&src.name=${appName}`
    if (componentType === 'text') {
      payload.text = payload.text + appendOptions(options)
      MessageObject = MessageObject + `&message.type=text&message.text=${payload.text}`
    } else if (componentType === 'card') {
      MessageObject = MessageObject + `&message.type=text&message.text=${payload.url}`
    } else {
      let message
      let url = payload.fileurl && payload.fileurl.url
      if (componentType === 'image' || payload.mediaType === 'image') {
        message = JSON.stringify({
          type: 'image',
          originalUrl: url,
          previewUrl: url,
          caption: payload.caption
        })
      } else if (componentType === 'file') {
        message = JSON.stringify({
          type: 'file',
          url: url,
          filename: payload.caption
        })
      } else if (componentType === 'audio') {
        message = JSON.stringify({
          type: 'audio',
          url: url
        })
      } else if (componentType === 'video' || payload.mediaType === 'video') {
        message = JSON.stringify({
          type: 'video',
          url: url,
          caption: payload.caption
        })
      }
      MessageObject = MessageObject + `&message=${message}`
    }
    resolve(MessageObject)
  })
}

exports.prepareReceivedMessageData = (body) => {
  let payload = {}
  return new Promise((resolve, reject) => {
    var media = ['image', 'video', 'audio', 'voice', 'file']
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
          } else if (body.type === 'file') {
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
        number: body.payload.contacts[0].phones[0].phone }
      resolve(payload)
    } else if (body.type === 'text' && body.payload.text !== '') {
      payload = { componentType: 'text', text: body.payload.text }
      resolve(payload)
    } else {
      resolve(payload)
    }
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

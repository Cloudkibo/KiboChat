const fs = require('fs')
const path = require('path')
const url = require('url')
const ogs = require('open-graph-scraper')

function prepareSendAPIPayload (subscriberId, body, fname, lname, isResponse) {
  let messageType = isResponse ? 'RESPONSE' : 'UPDATE'
  let payload = {}
  let message = {}
  let text = body.text
  if (body.componentType === 'text' && !body.buttons) {
    if (body.text.includes('{{user_full_name}}') || body.text.includes('[Username]')) {
      text = text.replace(
        /{{user_full_name}}/g, fname + ' ' + lname)
    }
    if (body.text.includes('{{user_first_name}}')) {
      text = text.replace(
        /{{user_first_name}}/g, fname)
    }
    if (body.text.includes('{{user_last_name}}')) {
      text = text.replace(
        /{{user_last_name}}/g, lname)
    }
    payload = {
      'messaging_type': messageType,
      'recipient': JSON.stringify({
        'id': subscriberId
      }),
      'message': {
        'text': text,
        'metadata': 'This is a meta data'
      }
    }
    if (body.quickReplies && body.quickReplies.length > 0) {
      payload.message.quick_replies = body.quickReplies
    }
    payload.message = JSON.stringify(payload.message)
    return payload
  } else if (body.componentType === 'text' && body.buttons) {
    if (body.text.includes('{{user_full_name}}') || body.text.includes('[Username]')) {
      text = text.replace(
        /{{user_full_name}}/g, fname + ' ' + lname)
    }
    if (body.text.includes('{{user_first_name}}')) {
      text = text.replace(
        /{{user_first_name}}/g, fname)
    }
    if (body.text.includes('{{user_last_name}}')) {
      text = text.replace(
        /{{user_last_name}}/g, lname)
    }
    payload = {
      'messaging_type': messageType,
      'recipient': JSON.stringify({
        'id': subscriberId
      }),
      'message': {
        'attachment': {
          'type': 'template',
          'payload': {
            'template_type': 'button',
            'text': text,
            'buttons': body.buttons
          }
        }
      }
    }
    if (body.quickReplies && body.quickReplies.length > 0) {
      payload.message.quick_replies = body.quickReplies
    }
    payload.message = JSON.stringify(payload.message)
  } else if (body.componentType === 'media') {
    let mediaElement = {
      'media_type': body.mediaType,
      'buttons': body.buttons
    }
    if (body.buttons && body.buttons.length > 0) {
      mediaElement.buttons = []
      for (let i = 0; i < body.buttons.length; i++) {
        let tempButton = {
          title: body.buttons[i].title,
          type: body.buttons[i].type,
          url: body.buttons[i].urlForFacebook ? body.buttons[i].urlForFacebook : body.buttons[i].url
        }
        mediaElement.buttons.push(tempButton)
      }
    }
    if (body.fileurl.attachment_id) {
      mediaElement.attachment_id = body.fileurl.attachment_id
    }
    if (body.fileurl.facebookUrl) {
      mediaElement.url = body.fileurl.facebookUrl
    }
    payload = {
      'messaging_type': messageType,
      'recipient': JSON.stringify({
        'id': subscriberId
      }),
      'message': {
        'attachment': {
          'type': 'template',
          'payload': {
            'template_type': 'media',
            'elements': [
              mediaElement
            ]
          }
        }
      }
    }
    if (body.quickReplies && body.quickReplies.length > 0) {
      payload.message.quick_replies = body.quickReplies
    }
    payload.message = JSON.stringify(payload.message)
  } else if (['image', 'audio', 'file', 'video'].indexOf(
    body.componentType) > -1) {
    if (body.fileurl && body.fileurl.attachment_id) {
      message = {
        'attachment': {
          'type': body.componentType,
          'payload': {
            'attachment_id': body.fileurl.attachment_id
          }
        }
      }
    } else {
      message = {
        'attachment': {
          'type': body.componentType,
          'payload': {
            'url': body.fileurl.url
          }
        }
      }
    }

    payload = {
      'messaging_type': messageType,
      'recipient': JSON.stringify({
        'id': subscriberId
      }),
      'message': message
    }
    if (body.quickReplies && body.quickReplies.length > 0) {
      payload.message.quick_replies = body.quickReplies
    }
    payload.message = JSON.stringify(payload.message)
    // todo test this one. we are not removing as we need to keep it for live chat
    // if (!isForLiveChat) deleteFile(body.fileurl)
  } else if (['gif', 'sticker', 'thumbsUp'].indexOf(
    body.componentType) > -1) {
    payload = {
      'messaging_type': messageType,
      'recipient': JSON.stringify({
        'id': subscriberId
      }),
      'message': JSON.stringify({
        'attachment': {
          'type': 'image',
          'payload': {
            'url': body.fileurl
          }
        }
      })
    }
  } else if (body.componentType === 'card') {
    payload = {
      'messaging_type': messageType,
      'recipient': JSON.stringify({
        'id': subscriberId
      }),
      'message': {
        'attachment': {
          'type': 'template',
          'payload': {
            'template_type': 'generic',
            'elements': [
              {
                'title': body.title,
                'image_url': body.image_url,
                'subtitle': body.description,
                'default_action': {
                  'type': 'web_url',
                  'url': body.url,
                  'messenger_extensions': false
                }
              }
            ]
          }
        }
      }
    }
    if (body.buttons && body.buttons.length > 0) {
      payload.message.attachment.payload.elements[0].buttons = []
      for (let i = 0; i < body.buttons.length; i++) {
        let tempButton = {
          title: body.buttons[i].title,
          type: body.buttons[i].type,
          url: body.buttons[i].urlForFacebook ? body.buttons[i].urlForFacebook : body.buttons[i].url
        }
        payload.message.attachment.payload.elements[0].buttons.push(tempButton)
      }
    }
    if (body.quickReplies && body.quickReplies.length > 0) {
      payload.message.quick_replies = body.quickReplies
    }
    payload.message = JSON.stringify(payload.message)
  } else if (body.componentType === 'gallery') {
    var galleryCards = []
    if (body.cards && body.cards.length > 0) {
      for (var g = 0; g < body.cards.length; g++) {
        var card = body.cards[g]
        var galleryCard = {}
        galleryCard.image_url = card.image_url
        galleryCard.title = card.title
        galleryCard.buttons = card.buttons
        galleryCard.subtitle = card.subtitle
        if (card.default_action) {
          galleryCard.default_action = card.default_action
        }
        galleryCards.push(galleryCard)
      }
    }
    payload = {
      'messaging_type': messageType,
      'recipient': JSON.stringify({
        'id': subscriberId
      }),
      'message': {
        'attachment': {
          'type': 'template',
          'payload': {
            'template_type': 'generic',
            'elements': galleryCards
          }
        }
      }
    }
    if (body.quickReplies && body.quickReplies.length > 0) {
      payload.message.quick_replies = body.quickReplies
    }
    payload.message = JSON.stringify(payload.message)
  } else if (body.componentType === 'list') {
    payload = {
      'messaging_type': messageType,
      'recipient': JSON.stringify({
        'id': subscriberId
      }),
      'message': JSON.stringify({
        'attachment': {
          'type': 'template',
          'payload': {
            'template_type': 'list',
            'top_element_style': body.topElementStyle,
            'elements': body.listItems,
            'buttons': body.buttons
          }
        }
      })
    }
  }
  return payload
}

function prepareMessageData (message) {
  let messageData = {}
  if (message.attachments) {
    if (message.attachments[0].payload.template_type === 'generic' && message.attachments[0].payload.elements.length === 1) {
      messageData = message.attachments[0].payload.elements[0]
      messageData.componentType = 'card'
    } else if (message.attachments[0].payload.template_type === 'generic' && message.attachments[0].payload.elements.length > 1) {
      messageData = {
        componentType: 'gallery',
        cards: message.attachments[0].payload.elements
      }
    } else if (message.attachments[0].payload.template_type === 'list') {
      messageData = {
        componentType: 'list',
        top_element_style: message.attachments[0].payload.top_element_style ? message.attachments[0].payload.top_element_style : 'large',
        elements: message.attachments[0].payload.elements,
        buttons: message.attachments[0].payload.buttons
      }
    } else if (message.attachments[0].payload.template_type === 'media') {
      // need to think how to get url from attachment_id
    } else if (message.attachments[0].payload.template_type === 'button') {
      messageData = message.attachments[0].payload
      messageData.text = message.text
      messageData.componentType = 'text'
    } else {
      messageData = {
        fileurl: message.attachments[0].payload,
        componentType: message.attachments[0].type,
        fileName: message.attachments[0].payload.url.split('?')[0].split('/')[message.attachments[0].payload.url.split('?')[0].split('/').length - 1]
      }
    }
    return messageData
  } else if (message.text) {
    messageData = {
      componentType: 'text',
      text: message.text
    }
    return messageData
  }
}

function prepareLiveChatPayload (message, subscriber, page) {
  return new Promise((resolve, reject) => {
    let payload = {}
    if (message.is_echo) {
      payload = {
        format: 'convos',
        sender_id: page._id,
        recipient_id: subscriber._id,
        sender_fb_id: subscriber.senderId,
        recipient_fb_id: page.pageId,
        subscriber_id: subscriber._id,
        company_id: page.companyId,
        status: 'unseen', // seen or unseen
        payload: prepareMessageData(message)
      }
      resolve(payload)
    } else {
      prepareUrlMeta(message)
        .then(data => {
          payload = {
            format: 'facebook',
            sender_id: subscriber._id,
            recipient_id: page._id,
            sender_fb_id: subscriber.senderId,
            recipient_fb_id: page.pageId,
            subscriber_id: subscriber._id,
            company_id: page.companyId,
            status: 'unseen', // seen or unseen
            payload: data
          }
          resolve(payload)
        })
    }
  })
}

const prepareUrlMeta = (data) => {
  return new Promise((resolve, reject) => {
    if (data.attachments && data.attachments.length > 0) {
      if (['video', 'audio', 'image', 'location', 'file'].includes(data.attachments[0].type)) {
        resolve(data)
      } else if (data.attachments[0].url) {
        const addr = url.parse(data.attachments[0].url, true)
        const attachmentUrl = addr.query.u
        let options = {url: attachmentUrl}
        ogs(options, (error, results) => {
          console.log(results)
          console.log(error)
          if (!error) {
            const payload = {
              type: 'url-card',
              text: data.text,
              title: results.data.ogTitle && results.data.ogTitle,
              description: results.data.ogDescription && results.data.ogDescription,
              imageUrl: results.data.ogImage && results.data.ogImage.url
            }
            resolve(payload)
          } else {
            let payload = JSON.parse(JSON.stringify(data))
            delete payload.attachments
            resolve(payload)
          }
        })
      } else {
        resolve(data)
      }
    } else {
      resolve(data)
    }
  })
}

function isJsonString (str) {
  try {
    JSON.parse(str)
  } catch (e) {
    return false
  }
  return true
}

exports.prepareSendAPIPayload = prepareSendAPIPayload
exports.prepareLiveChatPayload = prepareLiveChatPayload
exports.isJsonString = isJsonString

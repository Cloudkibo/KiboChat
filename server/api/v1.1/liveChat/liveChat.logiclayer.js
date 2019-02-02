
const fs = require('fs')
const path = require('path')

exports.getQueryData = (type, purpose, match, skip, sort, limit) => {
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
      skip,
      sort,
      limit
    }
  }
}

exports.getUpdateData = (purpose, match, updated, upsert, multi, neww) => {
  return {
    purpose,
    match,
    updated,
    upsert: upsert || false,
    multi: multi || false,
    new: neww || false
  }
}

exports.setChatProperties = (fbchats) => {
  console.log('fbchats', fbchats)
  for (var i = 0; i < fbchats.length; i++) {
    fbchats[i].lastPayload = fbchats[fbchats.length - 1].payload
    fbchats[i].lastRepliedBy = fbchats[fbchats.length - 1].replied_by
    fbchats[i].lastDateTime = fbchats[fbchats.length - 1].datetime
  }
  return fbchats
}

exports.prepareFbMessageObject = (body) => {
  let fbMessageObject = {
    sender_id: body.sender_id, // this is the page id: _id of Pageid
    recipient_id: body.recipient_id, // this is the subscriber id: _id of subscriberId
    sender_fb_id: body.sender_fb_id, // this is the (facebook) :page id of pageId
    recipient_fb_id: body.recipient_fb_id, // this is the (facebook) subscriber id : pageid of subscriber id
    session_id: body.session_id,
    company_id: body.company_id, // this is admin id till we have companies
    payload: body.payload, // this where message content will go
    url_meta: body.url_meta,
    status: 'unseen', // seen or unseen
    replied_by: body.replied_by
  }
  return fbMessageObject
}

exports.prepareSendAPIPayload = (subscriberId, body, fname, lname, isResponse) => {
  let messageType = isResponse ? 'RESPONSE' : 'UPDATE'
  let payload = {}
  let text = body.text
  if (body.componentType === 'text' && !body.buttons) {
    if (body.text.includes('{{user_full_name}}') || body.text.includes('[Username]')) {
      text = text.replace(
        '{{user_full_name}}', fname + ' ' + lname)
    }
    if (body.text.includes('{{user_first_name}}')) {
      text = text.replace(
        '{{user_first_name}}', fname)
    }
    if (body.text.includes('{{user_last_name}}')) {
      text = text.replace(
        '{{user_last_name}}', lname)
    }
    payload = {
      'messaging_type': messageType,
      'recipient': JSON.stringify({
        'id': subscriberId
      }),
      'message': JSON.stringify({
        'text': text,
        'metadata': 'This is a meta data'
      })
    }
    return payload
  } else if (body.componentType === 'text' && body.buttons) {
    if (body.text.includes('{{user_full_name}}') || body.text.includes('[Username]')) {
      text = text.replace(
        '{{user_full_name}}', fname + ' ' + lname)
    }
    if (body.text.includes('{{user_first_name}}')) {
      text = text.replace(
        '{{user_first_name}}', fname)
    }
    if (body.text.includes('{{user_last_name}}')) {
      text = text.replace(
        '{{user_last_name}}', lname)
    }
    payload = {
      'messaging_type': messageType,
      'recipient': JSON.stringify({
        'id': subscriberId
      }),
      'message': JSON.stringify({
        'attachment': {
          'type': 'template',
          'payload': {
            'template_type': 'button',
            'text': text,
            'buttons': body.buttons
          }
        }
      })
    }
  } else if (['image', 'audio', 'file', 'video'].indexOf(
    body.componentType) > -1) {
    let dir = path.resolve(__dirname, '../../../../broadcastFiles/userfiles')
    let fileReaderStream
    if (body.componentType === 'file') {
      fileReaderStream = fs.createReadStream(dir + '/' + body.fileurl.name)
    } else {
      fileReaderStream = fs.createReadStream(dir + '/' + body.fileurl.id)
    }

    payload = {
      'messaging_type': messageType,
      'recipient': JSON.stringify({
        'id': subscriberId
      }),
      'message': JSON.stringify({
        'attachment': {
          'type': body.componentType,
          'payload': {}
        }
      }),
      'filedata': fileReaderStream
    }
    return payload
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
      'message': JSON.stringify({
        'attachment': {
          'type': 'template',
          'payload': {
            'template_type': 'generic',
            'elements': [
              {
                'title': body.title,
                'image_url': body.image_url,
                'subtitle': body.description,
                'buttons': body.buttons
              }
            ]
          }
        }
      })
    }
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
      'message': JSON.stringify({
        'attachment': {
          'type': 'template',
          'payload': {
            'template_type': 'generic',
            'elements': galleryCards
          }
        }
      })
    }
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
exports.webhookPost = (needle, webhook, req, res) => {
  if (webhook && webhook.optIn.POLL_CREATED) {
    var data = {
      subscription_type: 'LIVE_CHAT_ACTIONS',
      payload: JSON.stringify({ // this is the subscriber id: _id of subscriberId
        pageId: req.body.sender_fb_id, // this is the (facebook) :page id of pageId
        subscriberId: req.body.recipient_fb_id, // this is the (facebook) subscriber id : pageid of subscriber id
        session_id: req.body.session_id,
        company_id: req.body.company_id, // this is admin id till we have companies
        payload: req.body.payload, // this where message content will go
        url_meta: req.body.url_meta,
        replied_by: req.body.replied_by
      })
    }
    needle.post(webhook.webhook_url, data,
      (error, response) => {
        if (error) {
          return res.status(500).json({
            status: 'failed',
            description: `Internal Server Error in Posting to Webhook ${JSON.stringify(error)}`
          })
        }
      })
  }
}

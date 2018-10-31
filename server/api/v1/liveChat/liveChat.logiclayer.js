
const fs = require('fs')
const path = require('path')

const setChatProperties = (fbchats) => {
  for (var i = 0; i < fbchats.length; i++) {
    fbchats[i].set('lastPayload', fbchats[fbchats.length - 1].payload, { strict: false })
    fbchats[i].set('lastRepliedBy', fbchats[fbchats.length - 1].replied_by, { strict: false })
    fbchats[i].set('lastDateTime', fbchats[fbchats.length - 1].datetime, { strict: false })
  }
  return fbchats
}

const prepareFbMessageObject = (body) => {
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
const prepareSendAPIPayload = (subscriberId, body, fname, lname, isResponse) => {
  console.log('Prepare Send API Payload', body)
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
    console.log('Payload', payload)
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
    let dir = path.resolve(__dirname, '../../../broadcastFiles/userfiles')
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
            'elements': body.cards
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
const webhookPost = (needle, webhook, req, res) => {
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
exports.setChatProperties = setChatProperties
exports.prepareFbMessageObject = prepareFbMessageObject
exports.prepareSendAPIPayload = prepareSendAPIPayload
exports.webhookPost = webhookPost

exports.prepareChat = (from, to, body, contact) => {
  let payload = getPayload(body)
  let MessageObject = {
    senderNumber: from,
    recipientNumber: to,
    contactId: contact._id,
    companyId: contact.companyId,
    payload: payload.payload,
    status: 'unseen',
    format: 'twilio'
  }
  if (Object.keys(payload.otherPayload).length === 0 && payload.otherPayload.constructor === Object) {
    return {messageObject: MessageObject}
  } else {
    let otherPayload = {
      senderNumber: from,
      recipientNumber: to,
      contactId: contact._id,
      companyId: contact.companyId,
      payload: payload.otherPayload,
      status: 'unseen',
      format: 'twilio'
    }
    return {messageObject: MessageObject, otherPayload: otherPayload}
  }
}
function getPayload (body) {
  let payload = {}
  let otherPayload = {}
  if (body.NumMedia === '0' && body.Body !== '') { // text only
    payload = {componentType: 'text', text: body.Body}
  } else if (body.NumMedia !== '0' && body.Body !== '' && body.MediaContentType0.includes('image')) { // text with media
    payload = {componentType: 'text', text: body.Body}
    otherPayload = {componentType: 'image', fileurl: {url: body.MediaUrl0}}
  } else if (body.NumMedia !== '0') { // media only
    if (body.MediaContentType0.includes('image')) {
      payload = {componentType: 'image', fileurl: {url: body.MediaUrl0}}
    } else if (body.MediaContentType0.includes('pdf')) {
      payload = {componentType: 'file', fileurl: {url: body.MediaUrl0}, fileName: `${body.Body}.pdf`}
    } else if (body.MediaContentType0.includes('audio')) {
      payload = {componentType: 'audio', fileurl: {url: body.MediaUrl0}}
    }
  }
  return {payload, otherPayload}
}

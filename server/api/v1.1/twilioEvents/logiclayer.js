exports.getPayload = (body) => {
  let payload = []
  if (body.NumMedia === '0' && body.Body !== '') { // text only
    payload.push({componentType: 'text', text: body.Body})
  } else if (body.NumMedia !== '0' && body.Body !== '' && body.MediaContentType0.includes('image')) { // text with media
    payload.push({componentType: 'text', text: body.Body})
    payload.push({componentType: 'image', fileurl: {url: body.MediaUrl0}})
  } else if (body.NumMedia !== '0' && body.Body !== '' && body.MediaContentType0.includes('video')) { // text with media
    payload.push({componentType: 'text', text: body.Body})
    payload.push({componentType: 'video', fileurl: {url: body.MediaUrl0}})
  } else if (body.NumMedia !== '0') { // media only
    if (body.MediaContentType0.includes('image')) {
      payload.push({componentType: 'image', fileurl: {url: body.MediaUrl0}})
    } else if (body.MediaContentType0.includes('pdf')) {
      payload.push({componentType: 'file', fileurl: {url: body.MediaUrl0}, fileName: `${body.Body}.pdf`})
    } else if (body.MediaContentType0.includes('audio')) {
      payload.push({componentType: 'audio', fileurl: {url: body.MediaUrl0}})
    } else if (body.MediaContentType0.includes('video')) {
      payload.push({componentType: 'video', fileurl: {url: body.MediaUrl0}})
    }
  }
  return payload
}
exports.prepareChat = (from, to, contact, body) => {
  let MessageObject = {
    senderNumber: from,
    recipientNumber: to,
    contactId: contact._id,
    companyId: contact.companyId,
    payload: body,
    status: 'unseen',
    format: 'twilio'
  }
  return MessageObject
}

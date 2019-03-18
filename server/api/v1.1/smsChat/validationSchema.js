exports.createPayload = {
  type: 'object',
  properties: {
    senderNumber: {
      type: 'string',
      required: true
    },
    recipientNumber: {
      type: 'string',
      required: true
    },
    contactId: {
      type: 'string',
      required: true
    },
    payload: {
      type: 'string',
      required: true
    }
  }
}

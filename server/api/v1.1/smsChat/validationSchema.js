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
      type: 'object',
      required: true
    }
  }
}
exports.getPayload = {
  'type': 'object',
  'properties': {
    'first_page': {
      'type': 'boolean'
    },
    'last_id': {
      'type': 'string'
    },
    'number_of_records': {
      'type': 'integer'
    }
  },
  'required': [
    'first_page',
    'last_id',
    'number_of_records'
  ]
}

exports.createPayload = {
  type: 'object',
  properties: {
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

exports.searchPayload = {
  type: 'object',
  properties: {
    subscriber_id: {
      type: 'string',
      required: true
    },
    text: {
      type: 'string',
      required: true
    }
  }
}

exports.setCustomFieldValue =
  {
    '$schema': 'http://json-schema.org/draft-04/schema#',
    'type': 'object',
    'properties': {
      'customFieldId': {
        'type': 'string'
      },
      'subscriberIds': {
        'type': 'array'
      },
      'value': {
        'type': 'string'
      }
    },
    'required': [
      'customFieldId',
      'subscriberIds',
      'value'
    ]
  }

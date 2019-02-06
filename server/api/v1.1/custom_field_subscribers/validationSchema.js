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

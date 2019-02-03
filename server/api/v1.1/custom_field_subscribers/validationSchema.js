exports.setCustomFieldValue =
  {
    '$schema': 'http://json-schema.org/draft-04/schema#',
    'type': 'object',
    'properties': {
      'customFieldId': {
        'type': 'string'
      },
      'subscriberId': {
        'type': 'array'
      },
      'value': {
        'type': 'string'
      }
    },
    'required': [
      'customFieldId',
      'subscriberId',
      'value'
    ]
  }

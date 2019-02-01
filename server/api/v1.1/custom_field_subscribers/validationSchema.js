exports.setCustomFieldValue =
  {
    '$schema': 'http://json-schema.org/draft-04/schema#',
    'type': 'object',
    'properties': {
      'customFieldId': {
        'type': 'string'
      },
      'subscriberId': {
        'type': 'string'
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

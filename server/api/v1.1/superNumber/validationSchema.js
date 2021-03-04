exports.sendManualMessagePayload = {
  'type': 'object',
  'properties': {
    'number': {
      'type': 'string'
    },
    'templateName': {
      'type': 'string'
    },
    'template': {
      'type': 'object'
    },
    'order': {
      'type': 'object'
    },
    'supportNumber': {
      'type': 'string'
    }
  },
  'required': [
    'number',
    'template',
    'supportNumber'
  ]
}

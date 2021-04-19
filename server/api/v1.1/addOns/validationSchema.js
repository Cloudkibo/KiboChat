exports.createPayload = {
  'type': 'object',
  'properties': {
    'feature': {
      'type': 'string'
    },
    'description': {
      'type': 'string'
    },
    'price': {
      'type': 'String'
    },
    'currency': {
      'type': 'string'
    },
    'permissions': {
      'type': 'array'
    }
  },
  'required': [
    'feature',
    'description',
    'price',
    'currency',
    'permissions'
  ]
}

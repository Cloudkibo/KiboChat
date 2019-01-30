exports.unSubscribePayload = {
  'type': 'object',
  'properties': {
    'subscriber_id': {
      'type': 'string'
    },
    'page_id': {
      'type': 'string'
    }
  },
  'required': [
    'subscriber_id',
    'page_id'
  ]
}

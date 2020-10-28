exports.createPayload = {
  'type': 'object',
  'properties': {
    'message': {
      'type': 'string'
    },
    'category': {
      'type': 'object'
    },
    'agentIds': {
      'type': 'array',
      'items': {}
    },
    'companyId': {
      'type': 'string'
    }
  },
  'required': [
    'message',
    'category',
    'agentIds',
    'companyId'
  ]
}
exports.markReadPayload = {
  'type': 'object',
  'properties': {
    'notificationId': {
      'type': 'string'
    }
  },
  'required': [
    'notificationId'
  ]
}

exports.queryPayload = {
  'type': 'object',
  'properties': {
    'records': {
      'type': 'number'
    },
    'lastId': {
      'type': 'string'
    }
  },
  'required': [
    'records'
  ]
}

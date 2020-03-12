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
exports.updatePendingResponsePayload = {
  'type': 'object',
  'properties': {
    'id': {
      'type': 'string'
    },
    'pendingResponse': {
      'type': 'boolean'
    }
  },
  'required': [
    'id',
    'pendingResponse'
  ]
}
exports.openSessionsPayload = {
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
    },
    'filter': {
      'type': 'boolean'
    },
    'filter_criteria': {
      'type': 'object',
      'properties': {
        'sort_value': {
          'type': 'integer'
        },
        'search_value': {
          'type': 'string'
        }
      },
      'required': [
        'sort_value',
        'search_value'
      ]
    }
  },
  'required': [
    'first_page',
    'last_id',
    'number_of_records',
    'filter_criteria'
  ]
}

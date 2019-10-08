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
    'filter_criteria': {
      'type': 'object',
      'properties': {
        'sort_value': {
          'type': 'integer'
        },
        'search_value': {
          'type': 'string'
        },
        'pendingResponse': {
          'type': 'boolean'
        },
        'unreadCount': {
          'type': 'boolean'
        }
      },
      'required': [
        'sort_value',
        'search_value',
        'pendingResponse',
        'unreadCount'
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
exports.changeStatusPayload = {
  'type': 'object',
  'properties': {
    '_id': {
      'type': 'string'
    },
    'status': {
      'type': 'string'
    }
  },
  'required': [
    '_id',
    'status'
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
exports.assignTeamPayload = {
  'type': 'object',
  'properties': {
    'teamId': {
      'type': 'string'
    },
    'teamName': {
      'type': 'string'
    },
    'subscriberId': {
      'type': 'string'
    },
    'isAssigned': {
      'type': 'boolean'
    }
  },
  'required': [
    'teamId',
    'teamName',
    'subscriberId',
    'isAssigned'
  ]
}

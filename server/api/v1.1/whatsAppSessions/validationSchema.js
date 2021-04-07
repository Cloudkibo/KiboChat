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

exports.assignAgentPayload = {
  'type': 'object',
  'properties': {
    'agentId': {
      'type': 'string'
    },
    'agentName': {
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
    'agentId',
    'agentName',
    'subscriberId',
    'isAssigned'
  ]
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

exports.updatePauseChatbotPayload = {
  'type': 'object',
  'properties': {
    'subscriberId': {
      'type': 'string'
    },
    'chatbotPaused': {
      'type': 'boolean'
    }
  },
  'required': [
    'subscriberId',
    'chatbotPaused'
  ]
}

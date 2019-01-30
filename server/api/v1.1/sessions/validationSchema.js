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
        'page_value': {
          'type': 'string'
        },
        'search_value': {
          'type': 'string'
        }
      },
      'required': [
        'sort_value',
        'page_value',
        'search_value'
      ]
    }
  },
  'required': [
    'first_page',
    'last_id',
    'number_of_records',
    'filter',
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
exports.assignAgentPayload = {
  'type': 'object',
  'properties': {
    'agentId': {
      'type': 'string'
    },
    'agentName': {
      'type': 'string'
    },
    'sessionId': {
      'type': 'string'
    },
    'isAssigned': {
      'type': 'boolean'
    }
  },
  'required': [
    'agentId',
    'agentName',
    'sessionId',
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
    'sessionId': {
      'type': 'string'
    },
    'isAssigned': {
      'type': 'boolean'
    }
  },
  'required': [
    'agentId',
    'agentName',
    'sessionId',
    'isAssigned'
  ]
}

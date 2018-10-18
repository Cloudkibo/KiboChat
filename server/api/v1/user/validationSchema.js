exports.updateChecksPayload = {
  '$schema': 'http://json-schema.org/draft-04/schema#',
  'type': 'object',
  'properties': {
    'user': {
      'type': 'object',
      'properties': {
        '_id': {
          'type': 'string'
        }
      },
      'required': [
        '_id'
      ]
    },
    'getStartedSeen': {
      'type': 'boolean'
    },
    'dashboardTourSeen': {
      'type': 'boolean'
    },
    'surveyTourSeen': {
      'type': 'boolean'
    },
    'convoTourSeen': {
      'type': 'boolean'
    },
    'pollTourSeen': {
      'type': 'boolean'
    },
    'growthToolsTourSeen': {
      'type': 'boolean'
    },
    'subscriberTourSeen': {
      'type': 'boolean'
    },
    'liveChatTourSeen': {
      'type': 'boolean'
    },
    'autoPostingTourSeen': {
      'type': 'boolean'
    },
    'mainMenuTourSeen': {
      'type': 'boolean'
    },
    'subscribeToMessengerTourSeen': {
      'type': 'boolean'
    },
    'pagesTourSeen': {
      'type': 'boolean'
    },
    'wizardSeen': {
      'type': 'boolean'
    }
  },
  'required': [
    'wizardSeen'
  ]
}

exports.updateMode = {
  '$schema': 'http://json-schema.org/draft-04/schema#',
  'type': 'object',
  'properties': {
    '_id': {
      'type': 'string'
    },
    'advancedMode': {
      'type': 'boolean'
    }
  },
  'required': [
    '_id',
    'advancedMode'
  ]
}

exports.authenticatePassword = {
  '$schema': 'http://json-schema.org/draft-04/schema#',
  'type': 'object',
  'properties': {
    'email': {
      'type': 'string'
    },
    'password': {
      'type': 'string'
    }
  },
  'required': [
    'email',
    'password'
  ]
}

exports.enableGDPRDelete = {
  type: 'object',
  properties: {
    delete_option: {
      type: 'string',
      required: true
    },
    deletion_date: {
      type: 'string',
      required: true
    }
  }
}

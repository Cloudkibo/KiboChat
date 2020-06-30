exports.createMeetingPayload = {
  'type': 'object',
  'properties': {
    'topic': {
      'type': 'string'
    },
    'agenda': {
      'type': 'string'
    },
    'invitationMessage': {
      'type': 'string'
    },
    'subscriberId': {
      'type': 'string'
    }
  },
  'required': [
    'topic',
    'agenda',
    'invitationMessage',
    'subscriberId'
  ]
}

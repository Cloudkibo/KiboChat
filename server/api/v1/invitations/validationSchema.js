exports.invitePayload = {
  'type': 'object',
  'properties': {
    name: {
      type: 'string',
      required: true
    },
    email: {
      type: 'string',
      required: true
    }
  }
}

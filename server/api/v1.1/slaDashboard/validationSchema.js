exports.indexPayload = {
  type: 'object',
  properties: {
    userId: {
      type: 'string'
    },
    pageId: {
      type: 'string'
    },
    teamId: {
      type: 'string'
    },
    days: {
      type: 'number',
      required: true
    }
  }
}

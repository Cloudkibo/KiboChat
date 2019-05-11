exports.createPayload = {
  type: 'object',
  properties: {
    webhook_url: {
      type: 'string',
      required: true
    },
    optIn: {
      type: 'object',
      required: true
    },
    pageId: {
      type: 'string',
      required: true
    },
    token: {
      type: 'string',
      required: true
    },
    isEnabled: {
      type: 'boolean'
    }
  }
}
exports.editPayload = {
  type: 'object',
  properties: {
    webhook_url: {
      type: 'string',
      required: true
    },
    optIn: {
      type: 'object',
      required: true
    },
    _id: {
      type: 'string',
      required: true
    }
  }
}
exports.enablePayload = {
  type: 'object',
  properties: {
    _id: {
      type: 'string',
      required: true
    },
    isEnabled: {
      type: 'boolean',
      required: true
    }
  }
}

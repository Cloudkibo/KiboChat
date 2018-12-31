exports.createPayload = {
  type: 'object',
  properties: {
    pageId: {
      type: 'string',
      required: true
    },
    ref_parameter: {
      type: 'string',
      required: true
    },
    reply: {
      type: 'array',
      required: true
    },
    sequenceId: {
      type: 'string',
      required: false
    }
  }
}
exports.updatePayload = {
  type: 'object',
  properties: {
    _id: {
      type: 'string',
      required: true
    },
    ref_parameter: {
      type: 'string',
      required: false
    },
    reply: {
      type: 'array',
      required: false
    },
    sequenceId: {
      type: 'string',
      required: false
    }
  }
}

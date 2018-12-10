exports.uploadPayload = {
  type: 'object',
  properties: {
    phoneColumn: {
      type: 'string',
      required: true
    },
    nameColumn: {
      type: 'string',
      required: true
    },
    text: {
      type: 'string',
      required: true
    },
    pageId: {
      type: 'string',
      required: true
    },
    _id: {
      type: 'string',
      required: true
    }
  }
}

exports.sendNumbersPayload = {
  type: 'object',
  properties: {
    numbers: {
      type: 'array',
      items: {
        type: 'string',
        required: true
      }
    },
    text: {
      type: 'string',
      required: true
    },
    pageId: {
      type: 'string',
      required: true
    },
    _id: {
      type: 'string',
      required: true
    }
  }
}

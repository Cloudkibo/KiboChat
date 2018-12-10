exports.getAllPayload = {
  'type': 'object',
  'properties': {
    'last_id': {
      'type': 'string'
    },
    'number_of_records': {
      'type': 'integer'
    },
    'first_page': {
      'type': 'string'
    },
    'requested_page': {
      'type': 'integer'
    },
    'current_page': {
      'type': 'integer'
    }
  },
  'required': [
    'last_id',
    'number_of_records',
    'first_page'
  ]
}
exports.createPayload = {
  type: 'object',
  properties: {
    listName: {
      type: 'string',
      required: true
    },
    content: {
      type: 'array',
      required: true
    },
    conditions: {
      type: 'array',
      required: true
    },
    parentListId: {
      type: 'string',
      required: false
    },
    parentListName: {
      type: 'string',
      required: false
    }
  }
}
exports.editPayload = {
  type: 'object',
  properties: {
    listName: {
      type: 'string',
      required: true
    },
    content: {
      type: 'array',
      required: true
    },
    conditions: {
      type: 'array',
      required: true
    },
    _id: {
      type: 'string',
      required: true
    }
  }
}

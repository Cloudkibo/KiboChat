/*
This file will contain the validation schemas.
By separating it from controller, we are cleaning the code.
Now the middleware will automatically send error response if the payload fails
*/

exports.getIntentPayload = {
  '$schema': 'http://json-schema.org/draft-04/schema#',
  'type': 'object',
  'properties': {
    'botId': {
      'type': 'string'
    }
  },
  'required': [
    'botId'
  ]
}

exports.createPayload = {
  '$schema': 'http://json-schema.org/draft-04/schema#',
  'type': 'object',
  'properties': {
    'name': {
      'type': 'string'
    },
    'botId': {
      'type': 'string'
    }
  },
  'required': [
    'name',
    'botId'
  ]
}

exports.updatePayload =
  {
    '$schema': 'http://json-schema.org/draft-04/schema#',
    'type': 'object',
    'properties': {
      'intentId': {
        'type': 'string'
      },
      'name': {
        'type': 'string'
      }
    },
    'required': [
      'name',
      'intentId'
    ]
  }

exports.deletePayload =
  {
    type: 'object',
    properties: {
      intentId: {
        type: 'string',
        required: true
      },
      gcpPojectId: {
        type: 'string',
        required: true
      },
      dialogflowIntentId: {
        type: 'string'
      }
    }
  }

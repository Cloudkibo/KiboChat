/*
This file will contain the validation schemas.
By separating it from controller, we are cleaning the code.
Now the middleware will automatically send error response if the payload fails
*/

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

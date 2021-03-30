/*
This file will contain the validation schemas.
By separating it from controller, we are cleaning the code.
Now the middleware will automatically send error response if the payload fails
*/

exports.createPayload = {
  'type': 'object',
  'properties': {
    'feature': {
      'type': 'string'
    },
    'description': {
      'type': 'string'
    },
    'price': {
      'type': 'number'
    },
    'currency': {
      'type': 'string'
    },
    'permissions': {
      'type': 'array'
    }
  },
  'required': [
    'feature',
    'description',
    'price',
    'price',
    'currency',
    'permissions'
  ]
}

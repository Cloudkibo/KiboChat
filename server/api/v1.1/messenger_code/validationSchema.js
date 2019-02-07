
/*
This file will contain the validation schemas.
By separating it from controller, we are cleaning the code.
Now the middleware will automatically send error response if the payload fails
*/

exports.createCodePayload = {
  '$schema': 'http://json-schema.org/draft-04/schema#',
  'type': 'object',
  'properties': {
    'type': {
      'type': 'string'
    },
    'data': {
      'type': 'object',
      'properties': {
        'ref': {
          'type': 'string'
        }
      }
    },
    'image_size': {
      'type': 'integer'
    },
    'pageId': {
      'type': 'string'
    }
  },
  'required': [
    'image_size',
    'pageId'
  ]
}

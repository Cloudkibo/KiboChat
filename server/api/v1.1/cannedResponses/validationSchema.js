/*
This file will contain the validation schemas.
By separating it from controller, we are cleaning the code.
Now the middleware will automatically send error response if the payload fails
*/

exports.createPayload = {
    '$schema': 'http://json-schema.org/draft-04/schema#',
    'type': 'object',
    'properties': {
      'responseCode': {
        'type': 'string'
      },
      'responseMessage': {
        'type': 'string'
      }
    },
    'required': [
      'responseCode',
      'responseMessage'
    ]
  }
  
  exports.updatePayload =
    {
      '$schema': 'http://json-schema.org/draft-04/schema#',
      'type': 'object',
      'properties': {
        'responseId': {
          'type': 'string'
        },
        'responseCode': {
          'type': 'string'
        },
        'responseMessage': {
          'type': 'string'
        }
      },
      'required': [
        'responseId'
      ]
    }
  
  exports.deletePayload =
    {
      '$schema': 'http://json-schema.org/draft-04/schema#',
      'type': 'object',
      'properties': {
        'responseId': {
          'type': 'string',
          'required': true
        },
      }
    }
    
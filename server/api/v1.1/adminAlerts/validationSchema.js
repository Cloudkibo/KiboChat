/*
This file will contain the validation schemas.
By separating it from controller, we are cleaning the code.
Now the middleware will automatically send error response if the payload fails
*/
  exports.updatePayload =
    {
      '$schema': 'http://json-schema.org/draft-04/schema#',
      'type': 'object',
      'properties': {
        'pendingSessionAlert': {
          'type': 'object'
        },
        'unresolveSessionAlert': {
          'type': 'object'
        }
      },
      'required': [
        'pendingSessionAlert',
        'unresolveSessionAlert'
      ]
    }
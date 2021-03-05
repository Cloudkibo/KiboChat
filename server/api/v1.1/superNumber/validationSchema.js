/*
This file will contain the validation schemas.
By separating it from controller, we are cleaning the code.
Now the middleware will automatically send error response if the payload fails
*/
// For express json validation
exports.createPayload = {
  '$schema': 'http://json-schema.org/draft-04/schema#',
  'type': 'object',
  'properties': {
    'abandonedCart': {
      'type': 'object'
    },
    'orderCRM': {
      'type': 'object'
    },
    'cashOnDelivery': {
      'type': 'object'
    }
  }
}

exports.updatePayload =
{
  '$schema': 'http://json-schema.org/draft-04/schema#',
  'type': 'object',
  'properties': {
    'abandonedCart': {
      'type': 'object'
    },
    'orderCRM': {
      'type': 'object'
    },
    'cashOnDelivery': {
      'type': 'object'
    }
  }
}

exports.sendManualMessagePayload = {
  'type': 'object',
  'properties': {
    'number': {
      'type': 'string'
    },
    'templateName': {
      'type': 'string'
    },
    'template': {
      'type': 'object'
    },
    'order': {
      'type': 'object'
    },
    'supportNumber': {
      'type': 'string'
    }
  },
  'required': [
    'number',
    'template',
    'supportNumber'
  ]
}

exports.createPayload = {
  '$schema': 'http://json-schema.org/draft-04/schema#',
  'type': 'object',
  'properties': {
    'companyId': {
      'type': 'string'
    },
    'abandonedCart': {
      'type': 'object'
    },
    'orderCRM': {
      'type': 'object'
    },
    'cashOnDelivery': {
      'type': 'object'
    }
  },
  'required': [
    'companyId'
  ]
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

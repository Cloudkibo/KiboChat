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
exports.summarisedPayload =
{
  '$schema': 'http://json-schema.org/draft-04/schema#',
  'type': 'object',
  'properties': {
    'startDate': {
      'type': 'string'
    },
    'endDate': {
      'type': 'string'
    }
  },
  'required': [
    'startDate',
    'endDate'
  ]
}
exports.detailedPayload =
{
  '$schema': 'http://json-schema.org/draft-04/schema#',
  'type': 'object',
  'properties': {
    'startDate': {
      'type': 'string'
    },
    'endDate': {
      'type': 'string'
    },
    'automated': {
      'type': 'bool'
    }
  },
  'required': [
    'startDate',
    'endDate',
    'automated'
  ]
}

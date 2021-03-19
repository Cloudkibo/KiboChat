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
exports.messageLogsPayload = {
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
      'type': 'number'
    },
    'current_page': {
      'type': 'number'
    },
    'automatedMessage': {
      'type': 'bool'
    }
  },
  'required': [
    'number_of_records',
    'first_page',
    'automatedMessage'
  ]
}
exports.storeOptinNumberFromWidget = {
  'type': 'object',
  'properties': {
    'companyId': {
      'type': 'string'
    },
    'name': {
      'type': 'string'
    },
    'contactNumber': {
      'type': 'string'
    }
  },
  'required': [
    'companyId',
    'contactNumber'
  ]
}

exports.allBroadcastsPayload = {
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
    'filter': {
      'type': 'boolean'
    },
    'filter_criteria': {
      'type': 'object',
      'properties': {
        'search_value': {
          'type': 'string'
        },
        'type_value': {
          'type': 'string'
        },
        'days': {
          'type': 'string'
        }
      },
      'required': [
        'search_value',
        'type_value',
        'days'
      ]
    }
  },
  'required': [
    'last_id',
    'number_of_records',
    'first_page',
    'filter',
    'filter_criteria'
  ]
}
exports.addButtonPayload = {
  'type': 'object',
  'properties': {
    'type': {
      'type': 'string'
    },
    'title': {
      'type': 'string'
    }
  },
  'required': [
    'type',
    'title'
  ]
}
exports.editButtonPayload = {
  'type': 'object',
  'properties': {
    'type': {
      'type': 'string'
    },
    'title': {
      'type': 'string'
    },
    'id': {
      'type': 'integer'
    }
  },
  'required': [
    'type',
    'title',
    'id'
  ]
}
exports.sendConversationPayload = {
  'type': 'object',
  'properties': {
    'platform': {
      'type': 'string'
    },
    'payload': {
      'type': 'array',
      'items': {}
    },
    'isSegmented': {
      'type': 'boolean'
    },
    'segmentationPageIds': {
      'type': 'array',
      'items': {}
    },
    'segmentationLocale': {
      'type': 'array',
      'items': {}
    },
    'segmentationGender': {
      'type': 'array',
      'items': {}
    },
    'segmentationTags': {
      'type': 'array',
      'items': {}
    },
    'title': {
      'type': 'string'
    },
    'segmentationList': {
      'type': 'array',
      'items': {}
    },
    'isList': {
      'type': 'boolean'
    },
    'fbMessageTag': {
      'type': 'string'
    }
  },
  'required': [
    'platform',
    'payload',
    'isSegmented',
    'segmentationPageIds',
    'segmentationLocale',
    'segmentationGender',
    'segmentationTags',
    'title',
    'segmentationList',
    'isList',
    'fbMessageTag'
  ]
}

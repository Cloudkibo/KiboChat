exports.payload = {
  type: 'object',
  properties: {
    last_id: {
      type: 'string',
      required: true
    },
    number_of_records: {
      type: 'number',
      required: true
    },
    first_page: {
      type: 'string',
      required: true
    }
  }
}

exports.createPayload = {
  type: 'object',
  properties: {
    number: {
      type: 'string',
      required: true
    }
  }
}

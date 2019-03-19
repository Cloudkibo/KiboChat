exports.uploadPayload = {
  type: 'object',
  properties: {
    phoneColumn: {
      type: 'string',
      required: true
    },
    nameColumn: {
      type: 'string',
      required: true
    }
  }
}
exports.uploadNumbersPayload = {
  type: 'object',
  properties: {
    numbers: {
      type: 'array',
      required: true
    }
  }
}

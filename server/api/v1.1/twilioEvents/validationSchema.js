exports.payload = {
  type: 'object',
  properties: {
    To: {
      type: 'string',
      required: true
    },
    From: {
      type: 'string',
      required: true
    },
    Body: {
      type: 'string',
      required: true
    }
  }
}
exports.payloadForWhatsApp = {
  type: 'object',
  properties: {
    payload: {
      type: 'object',
      required: true,
      properties: {
        To: {
          type: 'string',
          required: true
        },
        From: {
          type: 'string',
          required: true
        },
        Body: {
          type: 'string',
          required: true
        }
      }
    },
    contactId: {
      type: 'string',
      required: true
    }
  }
}

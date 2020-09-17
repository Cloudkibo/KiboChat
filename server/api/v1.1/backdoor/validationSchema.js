exports.actingAsUserPayload = {
  properties: {
    type: {
      type: 'string',
      required: true
    },
    domain_email: {
      type: 'string',
      required: false
    },
    name: {
      type: 'string',
      required: false
    }
  }
}

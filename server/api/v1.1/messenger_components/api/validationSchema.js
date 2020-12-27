exports.subscriberInfoPayload = {
  type: 'object',
  properties: {
    signed_request: {
      type: 'string',
      required: true
    },
    thread_type: {
      type: 'string',
      required: true
    },
    tid: {
      type: 'string',
      required: true
    },
    psid: {
      type: 'string',
      required: true
    }
  }
}

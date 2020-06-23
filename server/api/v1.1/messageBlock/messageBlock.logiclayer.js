exports.preparePayload = function (companyId, userId, body) {
  let payload = {
    module: {
      id: body.chatbotId,
      type: 'chatbot'
    },
    companyId: companyId,
    userId: userId,
    uniqueId: body.uniqueId,
    payload: body.payload,
    title: body.title
  }
  return payload
}

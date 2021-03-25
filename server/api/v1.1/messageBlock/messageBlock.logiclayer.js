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
    title: body.title,
    triggers: body.triggers
  }
  return payload
}

exports.prepareIntentPayload = function (body) {
  let payload = {
   displayName: body.title,
   trainingPhrases: []
  }
  if (body.triggers && body.triggers.length > 0){
    body.triggers.forEach(item => {
      payload.trainingPhrases.push({
        'type': 'TYPE_UNSPECIFIED',
        'parts': [
          {
            'text': item
          }
        ]
      })
    })
  }
  return payload
}

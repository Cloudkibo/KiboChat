exports.preparePayload = function (user, body) {
  const payload = {
    companyId: user.companyId,
    userId: user._id,
    chatbotId: `cb-${new Date().getTime()}`,
    title: body.title,
    published: false
  }
  return payload
}

exports.prepareBlockPayload = function (user, body) {
  const payload = {
    companyId: user.companyId,
    userId: user._id,
    chatbotId: body.chatbotId,
    uniqueId: body.uniqueId,
    payload: JSON.stringify(body.payload),
    options: JSON.stringify(body.payload),
    triggers: JSON.stringify(body.triggers)
  }
  return payload
}

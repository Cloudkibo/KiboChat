exports.preparePayload = function (user, body) {
  const payload = {
    companyId: user.companyId,
    userId: user._id,
    chatbotId: `cb-${new Date().getTime()}`,
    platform: user.platform,
    title: body.title,
    startingBlockId: body.startingBlockId,
    dialogFlowAgentId: body.dialogFlowAgentId,
    published: false
  }
  return payload
}

exports.prepareBlockPayload = function (user, body) {
  const payload = {
    title: body.title,
    companyId: user.companyId,
    userId: user._id,
    chatbotId: body.chatbotId,
    uniqueId: body.uniqueId,
    payload: body.payload,
    options: body.options,
    triggers: body.triggers
  }
  return payload
}

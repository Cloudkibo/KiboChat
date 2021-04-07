exports.preparePayload = function (user, body) {
  let payload = {
    companyId: user.companyId,
    userId: user._id,
    title: body.title,
    published: false
  }
  if (body.vertical && body.vertical === 'ecommerce') {
    payload.vertical = body.vertical
    payload.integration = body.integration
  } else {
    payload.chatbotId = `cb-${new Date().getTime()}`
    payload.platform = user.platform
    payload.startingBlockId = body.startingBlockId
    payload.dialogFlowAgentId = body.dialogFlowAgentId
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

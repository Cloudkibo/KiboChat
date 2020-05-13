exports.preparePayload = function (companyId, userId, body) {
  let payload = {
    companyId: companyId,
    userId: userId,
    ...body
  }
  return payload
}

exports.prepareIdsArray = function (payload) {
  let ids = []
  for (let i = 0; i < payload.length; i++) {
    ids.push(payload[i]._id)
  }
  return ids
}

exports.populatePageIdsInChatBots = function (pages, chatbots) {
  return chatbots.map((bot) => {
    bot.pageId = pages.filter(page => page._id === bot.pageId)[0]
  })
}

exports.chatbotBackupPayload = function (chatbot, blocks) {
  const startingBlock = blocks.find((item) => item._id === chatbot.startingBlockId)
  const payload = {
    chatbotId: chatbot._id,
    pageId: chatbot.pageId,
    companyId: chatbot.companyId,
    userId: chatbot.userId,
    datetime: new Date(),
    triggers: chatbot.triggers,
    startingBlockId: startingBlock.uniqueId
  }
  return payload
}

exports.blockBackupPayload = function (block) {
  const payload = {
    module: block.module,
    blockId: block._id,
    companyId: block.companyId,
    userId: block.userId,
    blockUniqueId: block.uniqueId,
    title: block.title,
    payload: block.payload,
    datetime: new Date()
  }
  return payload
}

exports.chatbotPayload = function (backup, startingBlock) {
  const payload = {
    triggers: backup.triggers,
    startingBlockId: startingBlock._id
  }
  return payload
}

exports.blockPayload = function (backup) {
  const payload = {
    module: backup.module,
    uniqueId: backup.blockUniqueId,
    payload: backup.payload,
    userId: backup.userId,
    companyId: backup.companyId,
    title: backup.title,
    datetime: backup.datetime
  }
  return payload
}

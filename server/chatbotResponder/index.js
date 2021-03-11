const chatbotDatalayer = require('../api/v1.1/configureChatbot/datalayer')
const logger = require('../components/logger')
const TAG = '/chatbotResponder/index.js'
const { smsMapper } = require('../smsMapper')
const { whatsAppMapper } = require('../whatsAppMapper/whatsAppMapper')
const { ActionTypes } = require('../smsMapper/constants')
const { callApi } = require('../api/v1.1/utility')
const { pushTalkToAgentAlertInStack } = require('../api/global/messageAlerts')

exports.respondUsingChatbot = (platform, provider, company, message, contact, isForTest) => {
  return new Promise((resolve, reject) => {
    let chatBotPayload = {companyId: company._id, published: true, platform}
    if (isForTest) {
      chatBotPayload = {chatbotId: contact.activeChatbotId, published: true, platform}
    }
    chatbotDatalayer.fetchChatbotRecords(chatBotPayload)
      .then(chatbots => {
        const chatbot = chatbots[0]
        const userText = message.toLowerCase().trim()
        if (chatbot && chatbot.startingBlockId) {
        // fetch blocks with matching trigger
          _fetchChatbotBlocks({
            companyId: company._id,
            chatbotId: chatbot.chatbotId,
            '$contains': {
              type: 'array',
              field: 'triggers',
              value: userText
            }
          })
            .then(blocks => {
              let block = blocks[0]
              if (block) {
              // trigger matched
                _respond(platform, provider, company, contact, block)
                pushTalkToAgentAlertInStack(company, contact, platform, chatbot.title)
                resolve(block)
              } else {
              // trigger not matched. check chatbot context
                if (contact.chatbotContext) {
                  _handleUserInput(userText, contact.chatbotContext)
                    .then(result => {
                      if (result.status === 'success') {
                        if (result.payload === 'talk_to_agent') {
                          let data = {
                            payload: [{componentType: 'text', text: 'Our support agents have been notified and someone will get back to you soon.'}],
                            options: []
                          }
                          _respond(platform, provider, company, contact, data)
                          resolve(block)
                        } else {
                        // correct option, send next block
                          _fetchChatbotBlocks({uniqueId: result.payload})
                            .then(result => {
                              block = result[0]
                              if (block) {
                                _respond(platform, provider, company, contact, block)
                                resolve(block)
                              }
                            })
                            .catch(err => {
                              const message = err || 'error in chat bot response'
                              logger.serverLog(message, `${TAG}: exports.respondUsingChatbot`, {}, {}, 'error')
                              reject(err)
                            })
                        }
                      } else {
                      // incorrect option, send fallback reply
                        _callMapperFunction(
                          platform,
                          provider,
                          {
                            text: result.description,
                            subscriber: contact,
                            company
                          },
                          ActionTypes.SEND_TEXT_MESSAGE
                        )
                          .then(sent => {
                          })
                          .catch(err => {
                            const message = err || 'error in chat bot response'
                            logger.serverLog(message, `${TAG}: exports.respondUsingChatbot`, {}, {platform, provider, company, message, contact}, 'error')
                            reject(err)
                          })
                      }
                    })
                    .catch(err => {
                      const message = err || 'error in chat bot response'
                      logger.serverLog(message, `${TAG}: exports.respondUsingChatbot`, {}, {platform, provider, company, message, contact}, 'error')
                      reject(err)
                    })
                }
              }
            })
            .catch(err => {
              const message = err || 'error in chat bot response'
              logger.serverLog(message, `${TAG}: exports.respondUsingChatbot`, {}, {platform, provider, company, message, contact}, 'error')
              reject(err)
            })
        } else {
          resolve(null)
        }
      })
      .catch(err => {
        const message = err || 'error in chat bot response'
        logger.serverLog(message, `${TAG}: exports.respondUsingChatbot`, {}, {platform, provider, company, message, contact}, 'error')
        reject(err)
      })
  })
}

const _fetchChatbotBlocks = (criteria) => {
  return chatbotDatalayer.fetchChatbotBlockRecords(criteria)
}

const _respond = (platform, provider, company, contact, block) => {
  _callMapperFunction(
    platform,
    provider,
    {
      payload: block.payload,
      options: block.options,
      subscriber: contact,
      company
    },
    ActionTypes.RESPOND_USING_CHATBOT
  )
    .then(sent => {
      if (block.options.length > 0) {
        _setChatbotContext(platform, contact, block)
      } else {
        _unsetChatbotContext(platform, contact)
      }
    })
    .catch(err => {
      const message = err || 'error in chat bot response'
      logger.serverLog(message, `${TAG}: exports._respond`, {}, {platform, provider, company, contact, block}, 'error')
    })
}

const _handleUserInput = (userText, context) => {
  return new Promise((resolve, reject) => {
    chatbotDatalayer.fetchChatbotBlockRecords({uniqueId: context})
      .then(blocks => {
        const block = blocks[0]
        if (block) {
          const options = block.options.map((item) => item.code)
          const index = options.indexOf(userText)
          if (index === -1) {
            resolve({status: 'failed', description: 'You have entered an incorrect option. Please try again.'})
          } else {
            resolve({status: 'success', payload: block.options[index].blockId})
          }
        } else {
          resolve({status: 'failed', description: 'You have entered an incorrect option. Please try again.'})
        }
      })
      .catch(err => {
        reject(err)
      })
  })
}

const _callMapperFunction = (platform, provider, data, action) => {
  if (platform === 'sms') {
    return smsMapper(provider, action, data)
  } else if (platform === 'whatsApp') {
    return whatsAppMapper(provider, action, data)
  }
}

const _setChatbotContext = (platform, contact, block) => {
  let module = ''
  if (platform === 'sms') {
    module = 'contacts'
  } else if (platform === 'whatsApp') {
    module = 'whatsAppContacts'
  }
  callApi(`${module}/update`, 'put', {query: {_id: contact._id}, newPayload: {$set: {chatbotContext: block.uniqueId}}, options: {}})
    .then(updated => {
    })
    .catch(err => {
      const message = err || 'error in set chatbot context'
      logger.serverLog(message, `${TAG}: exports._setChatbotContext`, {}, {platform, contact, block}, 'error')
    })
}

const _unsetChatbotContext = (platform, contact) => {
  let module = ''
  if (platform === 'sms') {
    module = 'contacts'
  } else if (platform === 'whatsApp') {
    module = 'whatsAppContacts'
  }
  callApi(`${module}/update`, 'put', {query: {_id: contact._id}, newPayload: {$unset: {chatbotContext: 1}}, options: {}})
    .then(updated => {
    })
    .catch(err => {
      const message = err || 'error in unset chatbot context'
      logger.serverLog(message, `${TAG}: exports._unsetChatbotContext`, {}, {platform, contact}, 'error')
    })
}

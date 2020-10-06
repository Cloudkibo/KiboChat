const chatbotDatalayer = require('../api/v1.1/configureChatbot/datalayer')
const logger = require('../components/logger')
const TAG = '/chatbotResponder/index.js'
const { smsMapper } = require('../smsMapper')
const { whatsAppMapper } = require('../whatsAppMapper/whatsAppMapper')
const { ActionTypes } = require('../smsMapper/constants')
const { callApi } = require('../api/v1.1/utility')

exports.respondUsingChatbot = (platform, provider, company, message, contact) => {
  chatbotDatalayer.fetchChatbotRecords({companyId: company._id, published: true})
    .then(chatbots => {
      const chatbot = chatbots[0]
      const userText = message.toLowerCase().trim()
      if (chatbot) {
        console.log(chatbot)
        if (contact.chatbotContext) {
          _handleUserInput(userText, contact.chatbotContext)
            .then(result => {
              if (result.status === 'success') {
                _respond(platform, provider, company, contact, {uniqueId: result.payload})
              } else {
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
                    logger.serverLog(TAG, 'fallback reply is sent', 'debug')
                  })
                  .catch(err => {
                    logger.serverLog(TAG, err, 'error')
                  })
              }
            })
            .catch(err => {
              logger.serverLog(TAG, err, 'error')
            })
        } else if (chatbot.startingBlockId) {
          _respond(
            platform,
            provider,
            company,
            contact,
            {
              uniqueId: chatbot.startingBlockId,
              '$contains': {
                type: 'array',
                field: 'triggers',
                value: userText
              }
            }
          )
        } else {
          logger.serverLog(TAG, 'chatbot startingBlockId is not set', 'error')
        }
      } else {
        logger.serverLog(TAG, 'chatbot not found or is diabled', 'debug')
      }
    })
    .catch(err => {
      logger.serverLog(TAG, err, 'error')
    })
}

const _respond = (platform, provider, company, contact, criteria) => {
  chatbotDatalayer.fetchChatbotBlockRecords(criteria)
    .then(chatbotBlocks => {
      const block = chatbotBlocks[0]
      if (block) {
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
            logger.serverLog(TAG, 'chatbot responded', 'debug')
            if (block.options.length > 0) {
              _setChatbotContext(platform, contact, block)
            } else {
              _unsetChatbotContext(platform, contact)
            }
          })
          .catch(err => {
            logger.serverLog(TAG, err, 'error')
          })
      }
    })
    .catch(err => {
      logger.serverLog(TAG, err, 'error')
    })
}

const _handleUserInput = (userText, context) => {
  return new Promise((resolve, reject) => {
    chatbotDatalayer.fetchChatbotBlockRecords({uniqueId: context})
      .then(blocks => {
        const block = blocks[0]
        const options = block.options.map((item) => item.code)
        const index = options.indexOf(userText)
        if (index === -1) {
          resolve({status: 'failed', description: 'You have entered an incorrect option. Please try again.'})
        } else {
          resolve({status: 'success', payload: block.options[index].blockId})
        }
      })
      .catch(err => { reject(err) })
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
      logger.serverLog(TAG, 'context is set', 'debug')
    })
    .catch(err => {
      logger.serverLog(TAG, err, 'error')
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
      logger.serverLog(TAG, 'context is unset', 'debug')
    })
    .catch(err => {
      logger.serverLog(TAG, err, 'error')
    })
}

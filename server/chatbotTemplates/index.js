const { handleWhatsAppInput } = require('./whatsApp')
const { handleMessengerInput } = require('./messenger')

exports.handleUserInput = function (chatbot, inputData, subscriber, channel) {
  return new Promise(async (resolve, reject) => {
    try {
      let response
      switch (channel) {
        case 'whatsApp':
          response = await handleWhatsAppInput(chatbot, inputData, subscriber)
          break
        case 'messenger':
          response = await handleMessengerInput(chatbot, inputData, subscriber)
          break
        default:
      }
      resolve(response)
    } catch (err) { reject(err) }
  })
}

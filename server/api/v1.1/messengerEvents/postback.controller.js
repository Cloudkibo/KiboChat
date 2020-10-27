const utility = require('../utility')
const logger = require('../../../components/logger')
const TAG = 'api/v1/messengerEvents/postback.controller'
const { handleCommerceChatbot } = require('./chatbotAutomation.controller')

exports.index = async (req, res) => {
  res.status(200).json({
    status: 'success',
    description: `received the payload`
  })
  try {
    const messengerPayload = req.body.entry[0].messaging[0]
    const pageId = messengerPayload.recipient.id
    const subscriberId = messengerPayload.sender.id
    console.log('kibochat postback controller')
    const pages = await utility.callApi('pages/query', 'post', { pageId, connected: true })
    const page = pages[0]
    if (page) {
      const subscribers = await utility.callApi('subscribers/query', 'post', { senderId: subscriberId, pageId: page._id })
      const subscriber = subscribers[0]
      handleCommerceChatbot(messengerPayload, page, subscriber)
    }
  } catch (err) {
    logger.serverLog(TAG, `error in postback ${err}`, 'error')
  }
}

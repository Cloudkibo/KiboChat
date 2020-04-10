const chatbotAutomation = require('./chatbotAutomation.controller')

exports.index = function (req, res) {
  res.status(200).json({
    status: 'success',
    description: `received the payload`
  })
  let page = req.body.page
  let subscriber = req.body.subscriber
  let event = req.body.entry[0].messaging[0]
  chatbotAutomation.handleChatBotAutomationEvents(event, page, subscriber)
}

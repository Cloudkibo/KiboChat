const chatbotAutomation = require('./chatbotAutomation.controller')
const utility = require('../utility')

exports.index = function (req, res) {
  res.status(200).json({
    status: 'success',
    description: `received the payload`
  })
  let page = req.body.page
  let subscriber = req.body.subscriber
  let event = req.body.entry[0].messaging[0]
  if (subscriber) {
    // It must be us testing by clicking getting started
    // after removing conversation history on messenger.
    // Don't do anything here. This is not logic for handling
    // new subscriber. It is just us clicking getting started
    // again and again
    chatbotAutomation.handleChatBotWelcomeMessage(event, page, subscriber)
  } else {
    setTimeout(function () {
      const sender = req.body.entry[0].messaging[0].sender.id
      utility.callApi('subscribers/query', 'post', { senderId: sender })
        .then(subscriberFound => {
          subscriber = subscriberFound[0]
          subscriber.isNewSubscriber = true
          chatbotAutomation.handleChatBotWelcomeMessage(event, page, subscriber)
        })
    }, 2500)
  }
}

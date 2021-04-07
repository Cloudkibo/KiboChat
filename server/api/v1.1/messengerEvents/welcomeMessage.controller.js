const chatbotAutomation = require('./chatbotAutomation.controller')
const utility = require('../utility')
const logger = require('../../../components/logger')
const TAG = 'api/v1/messengerEvents/welcomeMessage.controller'
const { pushSessionPendingAlertInStack, pushUnresolveAlertInStack } = require('../../global/messageAlerts')

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
    let subscriberEvent = JSON.parse(JSON.stringify(subscriber))
    subscriberEvent.pageId = page
    pushUnresolveAlertInStack({_id: subscriber.companyId}, subscriberEvent, 'messenger')
    chatbotAutomation.handleChatBotWelcomeMessage(event, page, subscriber)
  } else {
    const sender = req.body.entry[0].messaging[0].sender.id
    const pageId = req.body.entry[0].messaging[0].recipient.id
    utility.callApi(`pages/query`, 'post', { pageId: pageId, connected: true }, 'accounts')
      .then(page => {
        page = page[0]
        if (page) {
          utility.callApi('subscribers/query', 'post', {pageId: page._id, senderId: sender, companyId: page.companyId})
            .then(subscriberFound => {
              if (subscriberFound.length > 0) {
                subscriber = subscriberFound[0]
                subscriber.isNewSubscriber = true
                let subscriberEvent = JSON.parse(JSON.stringify(subscriber))
                subscriberEvent.pageId = page
                pushSessionPendingAlertInStack({_id: subscriber.companyId}, subscriberEvent, 'messenger')
                pushUnresolveAlertInStack({_id: subscriber.companyId}, subscriberEvent, 'messenger')
                chatbotAutomation.handleChatBotWelcomeMessage(event, page, subscriber)
              }
            }).catch(error => {
              const message = error || 'Failed to fetch subscriber'
              return logger.serverLog(message, `${TAG}: exports.index`, req.body, {companyId: page.companyId}, 'error')
            })
        }
      }).catch(error => {
        const message = error || 'Failed to fetch page'
        return logger.serverLog(message, `${TAG}: exports.index`, req.body, {companyId: page.companyId}, 'error')
      })
  }
}

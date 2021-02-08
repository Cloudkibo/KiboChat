const logger = require('../components/logger')
const TAG = 'scripts/abandoned-script.js'
const { callApi } = require('../api/v1.1/utility')
const async = require('async')
const EcommerceProvider = require('../api/v1.1/ecommerceProvidersApiLayer/EcommerceProvidersApiLayer.js')
const whatsAppChatbotDataLayer = require('../api/v1.1/whatsAppChatbot/whatsAppChatbot.datalayer')
const shopifyDataLayer = require('../api/v1.1/shopify/shopify.datalayer')
const commerceConstants = require('../api/v1.1/ecommerceProvidersApiLayer/constants')
const commerceChatbotLogicLayer = require('../api/v1.1/whatsAppChatbot/commerceChatbot.logiclayer')
const moment = require('moment')
const { sendWhatsAppMessage, updateWhatsAppContact } = require('../api/v1.1/whatsAppEvents/controller')
const ABANDONED_ALERT_INTERVAL = 2

exports.runScript = function () {
  let query = { 'abandonedCartInfo': { $exists: true, $ne: null } }
  /* Find all contacts with abandoned carts */
  callApi(`whatsAppContacts/query`, 'post', query)
    .then(contacts => {
      if (contacts.length === 0) return
      async.each(contacts, async function (contact, cb) {
        let chatbot = await whatsAppChatbotDataLayer.fetchWhatsAppChatbot({ _id: contact.activeChatbotId })
        const shopifyIntegration = await shopifyDataLayer.findOneShopifyIntegration({ companyId: chatbot.companyId })
        let ecommerceProvider = new EcommerceProvider(commerceConstants.shopify, {
          shopUrl: shopifyIntegration.shopUrl,
          shopToken: shopifyIntegration.shopToken
        })
        let abandonedCart = ecommerceProvider.fetchAbandonedCart(contact.abandonedCartInfo.abandonedCheckoutId)
        if (abandonedCart) {
          var now = moment(new Date())
          var abandonedCheckoutCreated = abandonedCart.created_at
          var duration = moment.duration(now.diff(abandonedCheckoutCreated))
          if (duration.asHours() >= ABANDONED_ALERT_INTERVAL) {
            let args = { contact, abandonedCart }
            const company = await callApi(`companyProfile/query`, 'post', { _id: contact.companyId })
            const data = {
              accessToken: company.whatsApp.accessToken,
              accountSID: company.whatsApp.accountSID,
              businessNumber: company.whatsApp.businessNumber
            }
            let abandonedCartReminderBlock = await commerceChatbotLogicLayer.getAbandonedCartReminderBlock(chatbot, contact, args)
            sendWhatsAppMessage(abandonedCartReminderBlock, data, contact.number, company, contact)
            let updatePayload = { last_activity_time: Date.now(), lastMessageSentByBot: abandonedCartReminderBlock }
            let incrementPayload = {}
            if (contact.abandonedCartInfo.cartRecoveryAttempts === 2) {
              unsetAbandonedInfo(contact)
            } else {
              incrementPayload = {$inc: { 'abandonedCartInfo.cartRecoveryAttempts ': 1 }}
            }
            updateWhatsAppContact(query, updatePayload, incrementPayload, {})
            cb()
          }
        }
      }, function (err) {
        if (err) {
          const message = err || 'error in sending abandoned reminders'
          return logger.serverLog(message, `${TAG}: exports.runScript`, {}, {err}, 'error')
        } else {
          const message = 'Abandoned reminders sent successfully'
          return logger.serverLog(message, `${TAG}: exports.runScript`, {}, {err}, 'info')
        }
      })
    })
    .catch(error => {
      const message = error || 'Failed to fetch whatsapp contacts'
      logger.serverLog(message, `${TAG}: exports.runScript`, {}, {}, 'error')
    })
}

function unsetAbandonedInfo (contact) {
  const updateQuery = {
    query: {_id: contact._id},
    newPayload: { abandonedCartInfo: null },
    options: {}
  }
  callApi(`whatsAppContacts/update`, 'put', updateQuery)
    .then(updatedRecord => {
      const message = 'Contact updated to nullify abandoned info'
      logger.serverLog(message, `${TAG}: exports.unsetAbandonedInfo`, {}, {}, 'info')
    })
    .catch(err => {
      const message = err || 'Failed to update whatsapp contacts'
      logger.serverLog(message, `${TAG}: exports.runScript`, {}, {}, 'error')
    })
}

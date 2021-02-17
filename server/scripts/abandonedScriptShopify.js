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
const RECOVERY_ATTEMPTS = 3

exports.runScript = function () {
  console.log('Run script abandoned shopify')
  let query = { 'commerceCustomerShopify.abandonedCartInfo': { $exists: true, $ne: null } }
  /* Find all contacts with abandoned carts */
  callApi(`whatsAppContacts/query`, 'post', query)
    .then(contacts => {
      if (contacts.length === 0) return
      async.each(contacts, async function (contact, cb) {
        console.log('contact', contact)
        let chatbot = await whatsAppChatbotDataLayer.fetchWhatsAppChatbot({ companyId: contact.companyId, published: true })
        console.log('chatbot', chatbot)
        const shopifyIntegration = await shopifyDataLayer.findOneShopifyIntegration({ companyId: contact.companyId })
        console.log('shopifyIntegration', shopifyIntegration)
        let ecommerceProvider = new EcommerceProvider(commerceConstants.shopify, {
          shopUrl: shopifyIntegration.shopUrl,
          shopToken: shopifyIntegration.shopToken
        })
        let commerceCustomerShopify = contact.commerceCustomerShopify
        console.log('commerceCustomerShopify', commerceCustomerShopify)
        let abandonedCart = await ecommerceProvider.fetchAbandonedCart(commerceCustomerShopify.abandonedCartInfo.token)
        console.log('abandonedCart', abandonedCart)
        if (abandonedCart) {
          var now = moment(new Date())
          var abandonedCheckoutCreated = abandonedCart.created_at
          var duration = moment.duration(now.diff(abandonedCheckoutCreated))
          console.log('duration', duration)
          if (duration.asHours() >= ABANDONED_ALERT_INTERVAL) {
            const company = await callApi(`companyProfile/query`, 'post', { _id: contact.companyId })
            const data = {
              accessToken: company.whatsApp.accessToken,
              accountSID: company.whatsApp.accountSID,
              businessNumber: company.whatsApp.businessNumber
            }
            let abandonedCartReminderBlock = await commerceChatbotLogicLayer.getAbandonedCartReminderBlock(chatbot, contact, ecommerceProvider, abandonedCart)
            console.log('abandonedCartReminderBlock', abandonedCartReminderBlock)
            await sendWhatsAppMessage(abandonedCartReminderBlock, data, contact.number, company, contact)
            let updatePayload = { last_activity_time: Date.now(), lastMessageSentByBot: abandonedCartReminderBlock }
            let incrementPayload = {}
            if (commerceCustomerShopify.abandonedCartInfo.cartRecoveryAttempts === RECOVERY_ATTEMPTS - 1) {
              unsetAbandonedInfo(contact)
            } else {
              incrementPayload = {$inc: { 'commerceCustomerShopify.abandonedCartInfo.cartRecoveryAttempts': 1 }}
            }
            updateWhatsAppContact({_id: contact._id}, updatePayload, incrementPayload, {})
            cb()
          }
        }
      }, function (err) {
        if (err) {
          const message = err || 'error in sending abandoned reminders'
          return logger.serverLog(message, `${TAG}: exports.runScript`, {}, {err}, 'error')
        } else {
          console.log('Abandoned reminders sent successfully')
          const message = 'Abandoned reminders sent successfully'
          return logger.serverLog(message, `${TAG}: exports.runScript`, {}, {}, 'info')
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
    newPayload: { 'commerceCustomerShopify.abandonedCartInfo': null },
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

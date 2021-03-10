const logger = require('../components/logger')
const TAG = 'scripts/abandoned-script.js'
const { callApi } = require('../api/v1.1/utility')
const { getSuperWhatsAppAccount } = require('../api/global/utility')
const {whatsAppMapper} = require('../whatsAppMapper/whatsAppMapper')
const {ActionTypes} = require('../whatsAppMapper/constants')
const EcommerceProvider = require('../api/v1.1/ecommerceProvidersApiLayer/EcommerceProvidersApiLayer.js')
const whatsAppChatbotDataLayer = require('../api/v1.1/whatsAppChatbot/whatsAppChatbot.datalayer')
const shopifyDataLayer = require('../api/v1.1/shopify/shopify.datalayer')
const commerceConstants = require('../api/v1.1/ecommerceProvidersApiLayer/constants')
const commerceChatbotLogicLayer = require('../api/v1.1/whatsAppChatbot/commerceChatbot.logiclayer')
const moment = require('moment')
const { sendWhatsAppMessage, updateWhatsAppContact } = require('../api/v1.1/whatsAppEvents/controller')
const superNumberDataLayer = require('../api/v1.1/superNumber/datalayer')
const ABANDONED_ALERT_INTERVAL = 2
const RECOVERY_ATTEMPTS = 3

exports.runScript = function () {
  let query = { 'commerceCustomerShopify.abandonedCartInfo': { $exists: true, $ne: null } }
  /* Find all contacts with abandoned carts */
  callApi(`whatsAppContacts/query`, 'post', query)
    .then(contacts => {
      if (contacts.length === 0) return
      Promise.all(contacts.map(async (contact) => {
        try {
          let company = await callApi(`companyProfile/query`, 'post', { _id: contact.companyId })
          if (company) {
            let shopifyIntegration = await shopifyDataLayer.findOneShopifyIntegration({ companyId: contact.companyId })
            if (shopifyIntegration) {
              let ecommerceProvider = new EcommerceProvider(commerceConstants.shopify, {
                shopUrl: shopifyIntegration.shopUrl,
                shopToken: shopifyIntegration.shopToken
              })
              let commerceCustomerShopify = contact.commerceCustomerShopify
              let abandonedCart = await ecommerceProvider.fetchAbandonedCart(commerceCustomerShopify.abandonedCartInfo.token)
              if (abandonedCart) {
                var now = moment(new Date())
                var abandonedCheckoutCreated = abandonedCart.created_at
                var duration = moment.duration(now.diff(abandonedCheckoutCreated))
                if (duration.asHours() >= ABANDONED_ALERT_INTERVAL) {
                  let abandonedCartReminderBlock = {}
                  let updatePayload = {}
                  const superNumberPreferences = await superNumberDataLayer.findOne({ companyId: company._id })
                  if (superNumberPreferences && superNumberPreferences.abandonedCart && superNumberPreferences.abandonedCart.enabled) {
                    abandonedCartReminderBlock = await getAbandonedCartMessage(superNumberPreferences, ecommerceProvider, contact, abandonedCart)
                    whatsAppMapper(abandonedCartReminderBlock.provider, ActionTypes.SEND_CHAT_MESSAGE, abandonedCartReminderBlock)
                  } else if (company.whatsApp) {
                    let data = {
                      accessToken: company.whatsApp.accessToken,
                      accountSID: company.whatsApp.accountSID,
                      businessNumber: company.whatsApp.businessNumber
                    }
                    let chatbot = await whatsAppChatbotDataLayer.fetchWhatsAppChatbot({ _id: company.whatsApp.activeWhatsappBot })
                    abandonedCartReminderBlock = await commerceChatbotLogicLayer.getAbandonedCartReminderBlock(chatbot, contact, ecommerceProvider, abandonedCart, company)
                    await sendWhatsAppMessage(abandonedCartReminderBlock, data, contact.number, company, contact)
                    updatePayload = { last_activity_time: Date.now(), lastMessageSentByBot: abandonedCartReminderBlock }
                  }
                  let incrementPayload = {}
                  if (commerceCustomerShopify.abandonedCartInfo.cartRecoveryAttempts === RECOVERY_ATTEMPTS - 1) {
                    unsetAbandonedInfo(contact)
                  } else {
                    incrementPayload = {$inc: { 'commerceCustomerShopify.abandonedCartInfo.cartRecoveryAttempts': 1 }}
                  }
                  updateWhatsAppContact({_id: contact._id}, updatePayload, incrementPayload, {})
                }
              }
            }
          }
        } catch (err) {
          const message = err || 'Failed to send abandoned reminder'
          return logger.serverLog(message, `${TAG}: exports.runScript`, {contacts, contact}, {}, 'error')
        }
      }))
        .then(result => {
          let message = 'Script Run Successfully'
          logger.serverLog(message, `${TAG}: exports.runScript`, {}, {contacts}, 'info')
        })
        .catch(err => {
          let message = err || 'Error while running script'
          logger.serverLog(message, `${TAG}: exports.runScript`, {}, {err, contacts}, 'error')
        })
    })
    .catch(error => {
      const message = error || 'Failed to fetch whatsapp contacts'
      return logger.serverLog(message, `${TAG}: exports.runScript`, {}, {error}, 'error')
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

async function getAbandonedCartMessage (superNumberPreferences, ecommerceProvider, contact, abandonedCart) {
  const storeInfo = await ecommerceProvider.fetchStoreInfo()
  let superWhatsAppAccount = getSuperWhatsAppAccount()
  let templateMessage = whatsAppMapper(
    superWhatsAppAccount.provider,
    ActionTypes.GET_COMMERCE_TEMPLATES,
    {type: 'ABANDONED_CART_RECOVERY', language: superNumberPreferences.abandonedCart.language})
  let replacedValues = prepareAbandonedCartMessage(contact, abandonedCart, superNumberPreferences.abandonedCart.supportNumber, storeInfo.name)
  let preparedMessage = {
    type: 'superNumber',
    provider: superWhatsAppAccount.provider,
    payload: {
      componentType: 'text',
      templateArguments: replacedValues,
      templateName: templateMessage.name,
      templateCode: templateMessage.code
    },
    whatsApp: superWhatsAppAccount,
    recipientNumber: contact.number
  }
  return preparedMessage
}
function prepareAbandonedCartMessage (contact, abandonedCart, supportNumber, shopName) {
  let templateArguments = ''
  if (abandonedCart.language === 'urdu') {
    templateArguments = `${contact.name},${shopName},${abandonedCart.currency} ${abandonedCart.total_price},${contact.commerceCustomerShopify.abandonedCartInfo.abandonedCheckoutUrl},https://wa.me/${supportNumber}`
  } else {
    templateArguments = `${contact.name},${abandonedCart.currency} ${abandonedCart.total_price},${shopName},${contact.commerceCustomerShopify.abandonedCartInfo.abandonedCheckoutUrl},https://wa.me/${supportNumber}`
  }
  return templateArguments
}

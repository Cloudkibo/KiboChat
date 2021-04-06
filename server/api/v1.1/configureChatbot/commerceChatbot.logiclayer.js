const constants = require('../whatsAppChatbot/constants')

exports.getCheckoutBlock = function () {

}
exports.getWelcomeMessageBlock = async (chatbot, contact, ecommerceProvider) => {
  let storeInfo = await ecommerceProvider.fetchStoreInfo()
  let welcomeMessage = 'Hi'

  if (contact.name && contact.name !== contact.number) {
    welcomeMessage += ` ${contact.name.split(' ')[0]}!`
  } else {
    welcomeMessage += `!`
  }
  welcomeMessage += ` Greetings from ${storeInfo.name} ${chatbot.integration} chatbot 🤖😀`

  welcomeMessage += `\n\nI am here to guide you on your journey of shopping on ${storeInfo.name}\n\n`
  welcomeMessage += 'Please select an option to let me know what you would like to do? (i.e. send “1” to View products on sale):\n\n0️⃣ Browse all categories\n1️⃣ View products on sale\n2️⃣ Search for a product\n3️⃣ View Catalog\n\n*O*  Check order status\n*C*  View your cart\n*T*  Talk to a customer support agent'

  const messageBlock = {
    module: {
      id: chatbot._id,
      type: 'sms_commerce_chatbot'
    },
    title: 'Main Menu',
    uniqueId: '' + new Date().getTime(),
    payload: [
      {
        text: welcomeMessage,
        componentType: 'text',
        menu: [
          {'type': 'DYNAMIC', 'action': constants.PRODUCT_CATEGORIES},
          {'type': 'DYNAMIC', 'action': constants.DISCOVER_PRODUCTS},
          {'type': 'DYNAMIC', 'action': constants.SEARCH_PRODUCTS},
          {'type': 'DYNAMIC', 'action': constants.VIEW_CATALOG}
        ],
        specialKeys: {
          [constants.ORDER_STATUS_KEY]: { type: constants.DYNAMIC, action: constants.VIEW_RECENT_ORDERS },
          [constants.SHOW_CART_KEY]: { type: constants.DYNAMIC, action: constants.SHOW_MY_CART },
          [constants.TALK_TO_AGENT_KEY]: {'type': 'DYNAMIC', 'action': constants.TALK_TO_AGENT}
        }
      }
    ],
    userId: chatbot.userId,
    companyId: chatbot.companyId
  }
  return messageBlock
}

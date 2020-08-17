const dedent = require('dedent-js')

exports.validateWhatsAppChatbotPayload = (payload) => {
  let bool = true
  let whatsAppChatbotFields = [
    'usedBy',
    'triggers',
    'botLinks',
    'testSubscribers',
    'startingBlockId',
    'maxLevels',
    'published',
    'stats'
  ]
  let arrayOfKeys = Object.keys(payload)

  arrayOfKeys.forEach(field => {
    if (!whatsAppChatbotFields.includes(field)) {
      bool = false
    }
  })

  return bool
}

exports.getMessageBlocks = (chatbotId, userId, companyId) => {
  const messageBlocks = []
  const mainMenuId = '' + new Date().getTime()
  const allCategoriesId = '' + (new Date().getTime() + 100)
  const discoverId = '' + (new Date().getTime() + 200)
  const orderStatusId = '' + (new Date().getTime() + 300)
  const returnItemId = '' + (new Date().getTime() + 400)
  const faqsId = '' + (new Date().getTime() + 500)

  messageBlocks.push({
    module: {
      id: chatbotId,
      type: 'whatsapp_chatbot'
    },
    title: 'Main Menu',
    uniqueId: mainMenuId,
    payload: [
      {
        text: dedent(`Please select an option by sending the corresponding number for it (e.g send “1” to select Discover):
                0. All Categories
                1. Discover
                2. Check order status
                3. Return an item
                4. FAQs`),
        componentType: 'text',
        menu: [
          allCategoriesId, // block message id for all categories block
          discoverId,
          orderStatusId,
          returnItemId,
          faqsId
        ]
      }
    ],
    userId,
    companyId
  })

  createAllCategoriesBlock(chatbotId, userId, companyId, allCategoriesId, mainMenuId, mainMenuId, messageBlocks)

  return messageBlocks
}

function createAllCategoriesBlock (chatbotId, userId, companyId, blockId, homeId, backId, messageBlocks) {
  const mobileTabletsId = '' + new Date().getTime()
  const computerLaptopsId = '' + (new Date().getTime() + 100)
  const fashionId = '' + (new Date().getTime() + 200)
  const camerasAccessoriesId = '' + (new Date().getTime() + 300)
  const tvVideoId = '' + (new Date().getTime() + 400)
  const homeAppliancesId = '' + (new Date().getTime() + 500)
  const musicInstrumentsId = '' + (new Date().getTime() + 600)
  const showMyCartId = '' + (new Date().getTime() + 700)
  messageBlocks.push({
    module: {
      id: chatbotId,
      type: 'whatsapp_chatbot'
    },
    title: 'All Categories',
    uniqueId: blockId,
    payload: [
      {
        text: dedent(`Please select an option by sending the corresponding number for it (e.g send “1” to select Computers & Laptops):
                0. Mobiles & Tablets
                1. Computers & Laptops
                2. Fashion
                3. Cameras & Accessories
                4. TV and Video
                5. Home Appliances
                6. Musical Instruments
                7. Show my cart,
                8. Back
                9. Home`),
        componentType: 'text',
        menu: [
          mobileTabletsId,
          computerLaptopsId,
          fashionId,
          camerasAccessoriesId,
          tvVideoId,
          homeAppliancesId,
          musicInstrumentsId,
          showMyCartId,
          backId,
          homeId
        ]
      }
    ],
    userId,
    companyId
  })
}

const responses = {
  '60239741344f0e55b251a87e': {
    'TALK_TO_AGENT': 'Hi! Thank you for choosing Sapphire. We have received your notification and one of our representatives will get back to you shortly.',
    'PRODUCT_CATEGORIES': 'Hi! Thank you for selecting Sapphire. Select your desired category for purchase.',
    'ON_SALE': 'Hi! This is to inform you that, currently we do not have any sale at the moment. Please subscribe to our newsletter for all the future updates regarding the sale.',
    'SEARCH_PRODUCTS': 'Hi! Kindly enter the name or SKU code of the article you wish to search for:-',
    'VIEW_CATALOG': 'Hi! Here is our catalog, have a look at the sublime range of articles.',
    'ASK_ORDER_ID': 'Hi! Thank you for contacting us. You are requested to please type your order number to check the instant status of it.'
  }
}

exports.getProfileIds = () => {
  return ['60239741344f0e55b251a87e']
}
exports.prepareText = (id, block) => {
  return responses[id][block]
}

exports.criteriaForPeriodicBotStats = (chatbotId, days) => {
  let matchAggregate = {
    chatbotId: chatbotId,
    'dateToday': {
      $gte: new Date(
        (new Date() - (days * 24 * 60 * 60 * 1000))),
      $lt: new Date(
        (new Date()))
    }
  }
  return matchAggregate
}

exports.criteriaForPeriodicBotStatsForGroup = () => {
  let groupCriteria = {
    '_id': '$chatbotId',
    'sentCount': {
      '$sum': '$sentCount'
    },
    'triggerWordsMatched': {
      '$sum': '$triggerWordsMatched'
    },
    'newSubscribersCount': {
      '$sum': '$newSubscribersCount'
    },
    'returningSubscribers': {
      '$sum': '$returningSubscribers'
    }
  }
  return groupCriteria
}

// NOTE: This is temporary function only for Adil testing
exports.getChatbotsListMessageBlock = (chatbots) => {
  let messageBlock = {
    module: {
      id: 'sojharo-s-chatbot-custom-id',
      type: 'whatsapp_chatbot'
    },
    title: 'Select Bot',
    uniqueId: '' + new Date().getTime(),
    payload: [
      {
        text: `Please select the desired chatbot from following: \n`,
        componentType: 'text',
        menu: []
      }
    ],
    userId: 'chatbot.userId', // written this way on purpose, this is testing thing - sojharo
    companyId: 'chatbot.companyId'
  }

  for (let i = 0; i < chatbots.length; i++) {
    const chatbot = chatbots[i]
    messageBlock.payload[0].text += `\n${convertToEmoji(i)} ${chatbot.title} `
    messageBlock.payload[0].menu.push({ botId: chatbot.botId, title: chatbot.title, built: chatbot.built })
  }
  return messageBlock
}

// NOTE: This is temporary function only for Adil testing
exports.getChatbotSelectedMessageBlock = (botName) => {
  let messageBlock = {
    module: {
      id: 'sojharo-s-chatbot-custom-id-selected-bot',
      type: 'whatsapp_chatbot'
    },
    title: 'Selected Bot',
    uniqueId: '' + new Date().getTime(),
    payload: [
      {
        text: `Successfully switched to the bot ${botName}. Please say hi to start chatting with this bot`,
        componentType: 'text',
        menu: []
      }
    ],
    userId: 'chatbot.userId', // written this way on purpose, this is testing thing - sojharo
    companyId: 'chatbot.companyId'
  }
  return messageBlock
}

function convertToEmoji (num) {
  let stringNum = num + ''
  const numbers = ['0️⃣', '1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣']
  let emoji = ''
  for (let i = 0; i < stringNum.length; i++) {
    emoji += numbers[parseInt(stringNum.charAt(i))]
  }
  return emoji
}

exports.convertToEmoji = convertToEmoji

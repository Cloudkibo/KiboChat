const dedent = require('dedent-js')
const {
  DYNAMIC,
  STATIC,
  FAQS_KEY,
  BACK_KEY,
  HOME_KEY,
  ERROR_INDICATOR,
  SELECT_AIRLINE,
  CHECK_FLIGHT_STATUS,
  AIRPORT_INFORMATION,
  GET_FLIGHTS,
  ASK_DEPARTURE_DATE,
  ASK_DEPARTURE_CITY,
  ASK_ARRIVAL_CITY
} = require('./constants')
const { convertToEmoji } = require('./whatsAppChatbot.logiclayer')
const logger = require('../../../components/logger')
const TAG = 'api/v1️.1/whatsAppChatbot/airlinesChatbot.logiclayer.js'
const messageBlockDataLayer = require('../messageBlock/messageBlock.datalayer')
const moment = require('moment')

const DEFAULT_ERROR_MESSAGE = `${ERROR_INDICATOR}Something went wrong! Please try again or send "Hi" to go back home.`

function specialKeyText (key) {
  switch (key) {
    case FAQS_KEY:
      return `Send '${key.toUpperCase()}' for faqs`
    case BACK_KEY:
      return `Send '${key.toUpperCase()}' to go back`
    case HOME_KEY:
      return `Send '${key.toUpperCase()}' to go home`
  }
}

exports.getMessageBlocks = (chatbot) => {
  const messageBlocks = []
  const mainMenuId = '' + new Date().getTime()
  const faqsId = '' + new Date().getTime() + 500

  messageBlocks.push({
    module: {
      id: chatbot._id,
      type: 'whatsapp_chatbot'
    },
    title: 'Main Menu',
    uniqueId: mainMenuId,
    payload: [
      {
        text: dedent(`Please select an option by sending the corresponding number for it (e.g. send '1' to select "Check status by flight number"):\n
                ${convertToEmoji(0)} Select airline for flight schedule
                ${convertToEmoji(1)} Check status by flight number
                ${convertToEmoji(2)} Airport information
                ${convertToEmoji(3)} Get all flights`),
        componentType: 'text',
        menu: [
          { type: DYNAMIC, action: SELECT_AIRLINE },
          { type: DYNAMIC, action: CHECK_FLIGHT_STATUS },
          { type: DYNAMIC, action: AIRPORT_INFORMATION },
          { type: DYNAMIC, action: GET_FLIGHTS }
        ]
      }
    ],
    userId: chatbot.userId,
    companyId: chatbot.companyId
  })
  if (chatbot.botLinks && chatbot.botLinks.faqs) {
    messageBlocks[0].payload[0].text += `\n${specialKeyText(FAQS_KEY)}`
    messageBlocks[0].payload[0].specialKeys[FAQS_KEY] = { type: STATIC, blockId: faqsId }
    getFaqsBlock(chatbot, faqsId, messageBlocks, mainMenuId)
  }
  return messageBlocks
}

const getFaqsBlock = (chatbot, blockId, messageBlocks, backId) => {
  messageBlocks.push({
    module: {
      id: chatbot._id,
      type: 'whatsapp_chatbot'
    },
    title: 'FAQs',
    uniqueId: blockId,
    payload: [
      {
        text: dedent(`View our FAQs here: ${chatbot.botLinks.faqs}\n
                          ${specialKeyText(BACK_KEY)}
                          ${specialKeyText(HOME_KEY)}
                        `),
        componentType: 'text',
        specialKeys: {
          [BACK_KEY]: { type: STATIC, blockId: backId },
          [HOME_KEY]: { type: STATIC, blockId: chatbot.startingBlockId }
        }
      }
    ],
    userId: chatbot.userId,
    companyId: chatbot.companyId
  })
}

const getSelectAirlineBlock = async (chatbot, AirlineProvider, backId) => {
  try {
    let messageBlock = {
      module: {
        id: chatbot._id,
        type: 'whatsapp_airlines_chatbot'
      },
      title: 'Select Airlines',
      uniqueId: '' + new Date().getTime(),
      payload: [
        {
          text: `Please select an airline by sending the corresponding number for it:\n`,
          componentType: 'text',
          menu: [],
          specialKeys: {
            [BACK_KEY]: { type: STATIC, blockId: backId },
            [HOME_KEY]: { type: STATIC, blockId: chatbot.startingBlockId }
          }
        }
      ],
      userId: chatbot.userId,
      companyId: chatbot.companyId
    }
    let airlines = await AirlineProvider.fetchAirlines()
    for (let i = 0; i < airlines.length; i++) {
      const airline = airlines[i]
      messageBlock.payload[0].text += `\n${convertToEmoji(i + 1)} ${airline.airline_name}`
      messageBlock.payload[0].menu.push({
        type: DYNAMIC, action: ASK_DEPARTURE_DATE, argument: {airline}
      })
    }
    messageBlock.payload[0].text += `\n${specialKeyText(BACK_KEY)}`
    messageBlock.payload[0].text += `\n${specialKeyText(HOME_KEY)}`
    return messageBlock
  } catch (err) {
    const message = err || 'Unable to get airlines'
    logger.serverLog(message, `${TAG}: exports.getSelectAirlineBlock`, {}, {chatbot}, 'error')
    throw new Error(`${ERROR_INDICATOR}Unable to get airlines`)
  }
}

const getAskDepartureDateBlock = async (chatbot, backId, argument) => {
  try {
    let messageBlock = {
      module: {
        id: chatbot._id,
        type: 'whatsapp_airlines_chatbot'
      },
      title: 'Ask Departure Date',
      uniqueId: '' + new Date().getTime(),
      payload: [
        {
          text: `Please enter your departure date in the format of YYYY/MM/DD`,
          componentType: 'text',
          action: { type: DYNAMIC, action: ASK_DEPARTURE_CITY, input: true, argument }
        }
      ],
      userId: chatbot.userId,
      companyId: chatbot.companyId
    }
    return messageBlock
  } catch (err) {
    const message = err || 'Unable to get Ask Departure Date block'
    logger.serverLog(message, `${TAG}: exports.getSelectAirlineBlock`, {}, {chatbot}, 'error')
    throw new Error(`${DEFAULT_ERROR_MESSAGE}`)
  }
}

const getAskDepartureCityBlock = async (chatbot, backId, userInput, argument) => {
  let userError = false
  try {
    if (new Date(userInput).toString() === 'Invalid Date') {
      userError = true
      throw new Error('Please enter a valid date in the format of YYYY/MM/DD')
    }
    let messageBlock = {
      module: {
        id: chatbot._id,
        type: 'whatsapp_airlines_chatbot'
      },
      title: 'Ask Departure City',
      uniqueId: '' + new Date().getTime(),
      payload: [
        {
          text: `Please enter your departure city`,
          componentType: 'text',
          action: { type: DYNAMIC, action: ASK_ARRIVAL_CITY, input: true, argument: {...argument, departure_date: new Date(userInput)} }
        }
      ],
      userId: chatbot.userId,
      companyId: chatbot.companyId
    }
    return messageBlock
  } catch (err) {
    if (!userError) {
      const message = err || 'Unable to get Ask Departure City block'
      logger.serverLog(message, `${TAG}: exports.getAskDepartureCityBlock`, {}, {chatbot, userInput}, 'error')
    }
    if (err.message) {
      throw new Error(`${ERROR_INDICATOR}${err.message}`)
    } else {
      throw new Error(`${DEFAULT_ERROR_MESSAGE}`)
    }
  }
}

const getAskArrivalCityBlock = async (chatbot, backId, userInput, argument) => {
  try {
    let messageBlock = {
      module: {
        id: chatbot._id,
        type: 'whatsapp_airlines_chatbot'
      },
      title: 'Ask Departure City',
      uniqueId: '' + new Date().getTime(),
      payload: [
        {
          text: `Please enter your arrival city`,
          componentType: 'text',
          action: { type: DYNAMIC, action: ASK_ARRIVAL_CITY, input: true, argument: {...argument, departure_city: userInput} }
        }
      ],
      userId: chatbot.userId,
      companyId: chatbot.companyId
    }
    return messageBlock
  } catch (err) {
    const message = err || 'Unable to get Ask Departure City Block'
    logger.serverLog(message, `${TAG}: exports.getAskArrivalCityBlock`, {}, {chatbot}, 'error')
    throw new Error(`${DEFAULT_ERROR_MESSAGE}`)
  }
}

const getWelcomeMessageBlock = async (chatbot, contact) => {
  let subscriberLastMessageAt = moment(contact.lastMessagedAt)
  let dateNow = moment()
  let welcomeMessage = 'Hi'

  if (contact.name && contact.name !== contact.number) {
    welcomeMessage += ` ${contact.name.split(' ')[0]}!`
  } else {
    welcomeMessage += `!`
  }
  if (dateNow.diff(subscriberLastMessageAt, 'days') >= 1 && contact.lastMessageSentByBot) {
    welcomeMessage += ` Welcome back!`
  }
  let messageBlock = await messageBlockDataLayer.findOneMessageBlock({ uniqueId: chatbot.startingBlockId })
  if (messageBlock) {
    messageBlock.payload[0].text = `${welcomeMessage}\n\n` + messageBlock.payload[0].text
    return messageBlock
  } else {
    return null
  }
}

const invalidInput = async (chatbot, messageBlock, errMessage) => {
  if (messageBlock.uniqueId === chatbot.startingBlockId) {
    messageBlock = await messageBlockDataLayer.findOneMessageBlock({ uniqueId: chatbot.startingBlockId })
  }
  if (messageBlock.payload[0].text.includes(ERROR_INDICATOR)) {
    messageBlock.payload[0].text = messageBlock.payload[0].text.split('\n').filter((line) => {
      return !line.includes(ERROR_INDICATOR)
    }).join('\n')
    messageBlock.payload[0].text = `${errMessage}\n` + messageBlock.payload[0].text
  } else {
    messageBlock.payload[0].text = `${errMessage}\n\n` + messageBlock.payload[0].text
  }

  return messageBlock
}

exports.getNextMessageBlock = async (chatbot, AirlineProvider, contact, input) => {
  let userError = false
  input = input.toLowerCase()
  if (!contact || !contact.lastMessageSentByBot) {
    if (chatbot.triggers.includes(input)) {
      return getWelcomeMessageBlock(chatbot, contact)
    }
  } else {
    let action = null
    let lastMessageSentByBot = contact.lastMessageSentByBot.payload[0]
    try {
      if (lastMessageSentByBot.specialKeys && lastMessageSentByBot.specialKeys[input]) {
        action = lastMessageSentByBot.specialKeys[input]
      } else if (lastMessageSentByBot.menu) {
        let menuInput = parseInt(input)
        if (isNaN(menuInput) || menuInput >= lastMessageSentByBot.menu.length || menuInput < 0) {
          if (isNaN(menuInput) && lastMessageSentByBot.action) {
            action = lastMessageSentByBot.action
          } else {
            userError = true
            throw new Error(`${ERROR_INDICATOR}Invalid User Input`)
          }
        } else {
          action = lastMessageSentByBot.menu[menuInput]
        }
      } else if (lastMessageSentByBot.action) {
        action = lastMessageSentByBot.action
      } else {
        userError = true
        throw new Error(`${ERROR_INDICATOR}Invalid User Input`)
      }
    } catch (err) {
      if (!userError) {
        const message = err || 'Invalid user input'
        logger.serverLog(message, `${TAG}: exports.getNextMessageBlock`, chatbot, {}, 'error')
      }
      if (chatbot.triggers.includes(input)) {
        return getWelcomeMessageBlock(chatbot, contact)
      } else {
        return invalidInput(chatbot, contact.lastMessageSentByBot, `${ERROR_INDICATOR}You entered an invalid response.`)
      }
    }
    if (action.type === DYNAMIC) {
      try {
        let messageBlock = null
        switch (action.action) {
          case SELECT_AIRLINE: {
            messageBlock = await getSelectAirlineBlock(chatbot, AirlineProvider, contact.lastMessageSentByBot.uniqueId)
            break
          }
          case ASK_DEPARTURE_DATE: {
            messageBlock = await getAskDepartureDateBlock(chatbot, contact.lastMessageSentByBot.uniqueId, action.input ? input : '', action.argument)
            break
          }
          case ASK_DEPARTURE_CITY: {
            messageBlock = await getAskDepartureCityBlock(chatbot, contact.lastMessageSentByBot.uniqueId, action.input ? input : '', action.argument)
            break
          }
          case ASK_ARRIVAL_CITY: {
            messageBlock = await getAskArrivalCityBlock(chatbot, contact.lastMessageSentByBot.uniqueId, action.input ? input : '', action.argument)
            break
          }
        }
        await messageBlockDataLayer.createForMessageBlock(messageBlock)
        return messageBlock
      } catch (err) {
        if (chatbot.triggers.includes(input)) {
          return getWelcomeMessageBlock(chatbot, contact)
        } else {
          return invalidInput(chatbot, contact.lastMessageSentByBot, err.message)
        }
      }
    } else if (action.type === STATIC) {
      return messageBlockDataLayer.findOneMessageBlock({ uniqueId: action.blockId })
    }
  }
}

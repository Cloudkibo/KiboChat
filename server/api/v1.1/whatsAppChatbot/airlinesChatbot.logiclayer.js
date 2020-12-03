const dedent = require('dedent-js')
const {
  DYNAMIC,
  STATIC,
  FAQS_KEY,
  BACK_KEY,
  HOME_KEY,
  ERROR_INDICATOR,
  SELECT_AIRLINE,
  ASK_AIRPORT_NAME,
  ASK_DEPARTURE_DATE,
  ASK_DEPARTURE_CITY,
  ASK_ARRIVAL_CITY,
  ASK_FLIGHT_NUMBER,
  GET_FLIGHT_SCHEDULES,
  GET_AIRPORT_INFO,
  GET_FLIGHT_STATUS,
  GET_FLIGHT_SCHEDULE_DETAILS
} = require('./constants')
const { convertToEmoji } = require('./whatsAppChatbot.logiclayer')
const logger = require('../../../components/logger')
const TAG = 'api/v1️.1/whatsAppChatbot/airlinesChatbot.logiclayer.js'
const messageBlockDataLayer = require('../messageBlock/messageBlock.datalayer')
const moment = require('moment')
const airlinesUtil = require('./../airlinesProvidersApiLayer/util')

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

exports.updateFaqsForStartingBlock = async (chatbot) => {
  let messageBlocks = []
  const faqsId = '' + new Date().getTime()
  let startingBlock = await messageBlockDataLayer.findOneMessageBlock({ uniqueId: chatbot.startingBlockId })
  if (!startingBlock.payload[0].specialKeys[FAQS_KEY]) {
    if (chatbot.botLinks && chatbot.botLinks.faqs) {
      startingBlock.payload[0].text += `\n${specialKeyText(FAQS_KEY)}`
      startingBlock.payload[0].specialKeys[FAQS_KEY] = { type: STATIC, blockId: faqsId }
      getFaqsBlock(chatbot, faqsId, messageBlocks, chatbot.startingBlockId)
      messageBlockDataLayer.genericUpdateMessageBlock({ uniqueId: chatbot.startingBlockId }, startingBlock)
      messageBlockDataLayer.createForMessageBlock(messageBlocks[0])
    }
  } else {
    if (chatbot.botLinks && chatbot.botLinks.faqs) {
      startingBlock.payload[0].specialKeys[FAQS_KEY] = { type: STATIC, blockId: faqsId }
      getFaqsBlock(chatbot, faqsId, messageBlocks, chatbot.startingBlockId)
      messageBlockDataLayer.genericUpdateMessageBlock({ uniqueId: chatbot.startingBlockId }, startingBlock)
      messageBlockDataLayer.createForMessageBlock(messageBlocks[0])
    } else {
      startingBlock.payload[0].text = startingBlock.payload[0].text.replace(`\n${specialKeyText(FAQS_KEY)}`, '')
      delete startingBlock.payload[0].specialKeys[FAQS_KEY]
      messageBlockDataLayer.genericUpdateMessageBlock({ uniqueId: chatbot.startingBlockId }, startingBlock)
    }
  }
}

exports.getMessageBlocks = (chatbot) => {
  const messageBlocks = []
  const mainMenuId = '' + new Date().getTime()
  const faqsId = '' + new Date().getTime() + 500

  messageBlocks.push({
    module: {
      id: chatbot._id,
      type: 'whatsapp_airlines_chatbot'
    },
    title: 'Main Menu',
    uniqueId: mainMenuId,
    payload: [
      {
        text: dedent(`Please select an option by sending the corresponding number for it (e.g. send '1' to select "Check status by flight number"):\n
                ${convertToEmoji(0)} Get flight schedules        
                ${convertToEmoji(1)} Check status by flight number
                ${convertToEmoji(2)} Airport information
                ${convertToEmoji(3)} Select airline for flight schedule`),
        componentType: 'text',
        menu: [
          { type: DYNAMIC, action: ASK_DEPARTURE_DATE },
          { type: DYNAMIC, action: ASK_FLIGHT_NUMBER },
          { type: DYNAMIC, action: ASK_AIRPORT_NAME },
          { type: DYNAMIC, action: SELECT_AIRLINE }
        ],
        specialKeys: {}
      }
    ],
    userId: chatbot.userId,
    companyId: chatbot.companyId
  })
  if (chatbot.botLinks && chatbot.botLinks.faqs) {
    messageBlocks[0].payload[0].text += `\n\n${specialKeyText(FAQS_KEY)}`
    messageBlocks[0].payload[0].specialKeys[FAQS_KEY] = { type: STATIC, blockId: faqsId }
    getFaqsBlock(chatbot, faqsId, messageBlocks, mainMenuId)
  }
  return messageBlocks
}

const getAskFlightNumberBlock = (chatbot) => {
  try {
    let messageBlock = {
      module: {
        id: chatbot._id,
        type: 'whatsapp_airlines_chatbot'
      },
      title: 'Ask Airport Name',
      uniqueId: '' + new Date().getTime(),
      payload: [
        {
          text: `Please enter the flight number`,
          componentType: 'text',
          action: { type: DYNAMIC, action: GET_FLIGHT_STATUS, input: true }
        }
      ],
      userId: chatbot.userId,
      companyId: chatbot.companyId
    }
    return messageBlock
  } catch (err) {
    const message = err || 'Unable to get Ask Flight Number block'
    logger.serverLog(message, `${TAG}: getAskFlightNumberBlock`, {}, {chatbot}, 'error')
    throw new Error(`${DEFAULT_ERROR_MESSAGE}`)
  }
}

const getFlightStatusBlock = async (chatbot, backId, AirlineProvider, userInput) => {
  try {
    let messageBlock = {
      module: {
        id: chatbot._id,
        type: 'whatsapp_airlines_chatbot'
      },
      title: 'Get Flight Status',
      uniqueId: '' + new Date().getTime(),
      payload: [
        {
          text: '',
          componentType: 'text',
          specialKeys: {
            [BACK_KEY]: { type: STATIC, blockId: backId },
            [HOME_KEY]: { type: STATIC, blockId: chatbot.startingBlockId }
          }
        }
      ],
      userId: chatbot.userId,
      companyId: chatbot.companyId
    }
    let flightInfo = await AirlineProvider.fetchFlightByNumber(userInput)
    flightInfo = flightInfo[0]
    if (flightInfo) {
      messageBlock.payload[0].text += `*Airline*: ${flightInfo.airline.name}`
      messageBlock.payload[0].text += `\n*Flight Number*: ${flightInfo.flight.iata}`
      messageBlock.payload[0].text += `\n*Flight Status*: ${flightInfo.flight_status}`
      messageBlock.payload[0].text += `\n*Departure Time*: ${new Date(flightInfo.departure.scheduled).toLocaleString('en-US', {timeZone: flightInfo.departure.timezone, dateStyle: 'full', timeStyle: 'full'})}`
      messageBlock.payload[0].text += `\n*Arrival Time*: ${new Date(flightInfo.arrival.scheduled).toLocaleString('en-US', {timeZone: flightInfo.arrival.timezone, dateStyle: 'full', timeStyle: 'full'})}`
      messageBlock.payload[0].text += `\n*Departure Airport*: ${flightInfo.departure.airport}`
      messageBlock.payload[0].text += `\n*Departure Airport Location*: https://www.google.com/maps/search/?api=1&query=${escape(flightInfo.departure.airport)}`
      messageBlock.payload[0].text += `\n*Arrival Airport*: ${flightInfo.arrival.airport}`
      messageBlock.payload[0].text += `\n*Arrival Airport Location*: https://www.google.com/maps/search/?api=1&query=${escape(flightInfo.arrival.airport)}`
    } else {
      messageBlock.payload[0].text += `No flight info found for flight number ${userInput}`
    }
    messageBlock.payload[0].text += `\n\n${specialKeyText(BACK_KEY)}`
    messageBlock.payload[0].text += `\n${specialKeyText(HOME_KEY)}`
    return messageBlock
  } catch (err) {
    const message = err || 'Unable to get flight status'
    logger.serverLog(message, `${TAG}: getFlightStatus`, {}, {chatbot}, 'error')
    throw new Error(`${ERROR_INDICATOR} Unable to get flight status for ${userInput}`)
  }
}

const getAskAirportNameBlock = (chatbot) => {
  try {
    let messageBlock = {
      module: {
        id: chatbot._id,
        type: 'whatsapp_airlines_chatbot'
      },
      title: 'Ask Airport Name',
      uniqueId: '' + new Date().getTime(),
      payload: [
        {
          text: `Please enter the name of the airport for which you wish to retreive information`,
          componentType: 'text',
          action: { type: DYNAMIC, action: GET_AIRPORT_INFO, input: true }
        }
      ],
      userId: chatbot.userId,
      companyId: chatbot.companyId
    }
    return messageBlock
  } catch (err) {
    const message = err || 'Unable to get Ask Airport Name block'
    logger.serverLog(message, `${TAG}: exports.getAskAirportNameBlock`, {}, {chatbot}, 'error')
    throw new Error(`${DEFAULT_ERROR_MESSAGE}`)
  }
}

const getAirportInfoBlock = (chatbot, backId, AirlineProvider, userInput) => {
  let userError = false
  try {
    let messageBlock = {
      module: {
        id: chatbot._id,
        type: 'whatsapp_airlines_chatbot'
      },
      title: 'Airport Information',
      uniqueId: '' + new Date().getTime(),
      payload: [
        {
          text: '',
          componentType: 'text',
          action: { type: DYNAMIC, action: GET_AIRPORT_INFO },
          specialKeys: {
            [BACK_KEY]: { type: STATIC, blockId: backId },
            [HOME_KEY]: { type: STATIC, blockId: chatbot.startingBlockId }
          }
        }
      ],
      userId: chatbot.userId,
      companyId: chatbot.companyId
    }
    const airportInfo = AirlineProvider.fetchAirportInfo(userInput)
    if (airportInfo) {
      // messageBlock.payload[0].text += `\n*Location*: https://www.google.com/maps/search/?api=1&query=${airportInfo.latitude},${airportInfo.longitude}`
      messageBlock.payload[0].text += `\n*Location*: https://www.google.com/maps/search/?api=1&query=${escape(airportInfo['Airport name'])}`
    } else {
      userError = true
      throw new Error()
    }
    messageBlock.payload[0].text += `\n\n${specialKeyText(BACK_KEY)}`
    messageBlock.payload[0].text += `\n${specialKeyText(HOME_KEY)}`
    return messageBlock
  } catch (err) {
    if (!userError) {
      const message = err || `Unable to get Airport Information for ${userInput}`
      logger.serverLog(message, `${TAG}: exports.getAskAirportNameBlock`, {}, {chatbot}, 'error')
    }
    throw new Error(`${ERROR_INDICATOR}Unable to get Airport Information for ${userInput}`)
  }
}

const getFaqsBlock = (chatbot, blockId, messageBlocks, backId) => {
  messageBlocks.push({
    module: {
      id: chatbot._id,
      type: 'whatsapp_airlines_chatbot'
    },
    title: 'FAQs',
    uniqueId: blockId,
    payload: [
      {
        text: dedent(`View our FAQs here: ${chatbot.botLinks.faqs}\n
                      ${specialKeyText(BACK_KEY)}`),
        componentType: 'text',
        specialKeys: {
          [BACK_KEY]: { type: STATIC, blockId: backId }
        }
      }
    ],
    userId: chatbot.userId,
    companyId: chatbot.companyId
  })
}

const getSelectAirlineBlock = async (chatbot, backId, AirlineProvider) => {
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
      messageBlock.payload[0].text += `\n${convertToEmoji(i)} ${airline.airline_name}`
      messageBlock.payload[0].menu.push({
        type: DYNAMIC, action: ASK_DEPARTURE_DATE, argument: {airline}
      })
    }
    messageBlock.payload[0].text += `\n\n${specialKeyText(BACK_KEY)}`
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
          text: '',
          componentType: 'text',
          action: { type: DYNAMIC, action: ASK_DEPARTURE_CITY, input: true, argument }
        }
      ],
      userId: chatbot.userId,
      companyId: chatbot.companyId
    }
    if (argument.airline) {
      messageBlock.payload[0].text += `You have selected ${argument.airline.airline_name}\n\n`
    }
    messageBlock.payload[0].text += 'Please enter your departure date in the format of YYYY-MM-DD'
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
      throw new Error('Please enter a valid date in the format of YYYY-MM-DD')
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
          action: { type: DYNAMIC, action: GET_FLIGHT_SCHEDULES, input: true, argument: {...argument, departure_city: userInput} }
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

const getFlightSchedulesBlock = async (chatbot, backId, AirlineProvider, userInput, argument) => {
  try {
    let messageBlock = {
      module: {
        id: chatbot._id,
        type: 'whatsapp_airlines_chatbot'
      },
      title: 'Get Flight Schedules',
      uniqueId: '' + new Date().getTime(),
      payload: [
        {
          text: '',
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
    argument.arrival_city = userInput
    const departureCity = airlinesUtil.findCityInfo(argument.departure_city)[0]['IATA']
    const arrivalCity = airlinesUtil.findCityInfo(argument.arrival_city)[0]['IATA']
    const airline = argument.airline ? argument.airline.airline_name : null
    let flights = await AirlineProvider.fetchFlights(departureCity, arrivalCity, argument.departure_date, airline)

    if (flights.length === 0) {
      messageBlock.payload[0].text += `No Flights found\n`
    } else {
      messageBlock.payload[0].text += `Select a flight by sending the corresponding number for it:\n`
      flights = flights.filter(f => f.flight && f.flight.iata)
      flights = flights.slice(0, 10)
    }
    for (let i = 0; i < flights.length; i++) {
      const flight = flights[i]
      messageBlock.payload[0].text += `\n${convertToEmoji(i)} ${flight.airline.name} ${flight.flight.iata}`
      messageBlock.payload[0].text += `\n*Departure Time*: ${new Date(flight.departure.scheduled).toLocaleString('en-US', {timeZone: flight.departure.timezone, dateStyle: 'full', timeStyle: 'full'})}`
      messageBlock.payload[0].text += `\n*Arrival Time*: ${new Date(flight.arrival.scheduled).toLocaleString('en-US', {timeZone: flight.arrival.timezone, dateStyle: 'full', timeStyle: 'full'})}`
      messageBlock.payload[0].menu.push({type: DYNAMIC, action: GET_FLIGHT_SCHEDULE_DETAILS, argument: {...argument, flight}})
      if (i + 1 < flights.length) {
        messageBlock.payload[0].text += `\n`
      }
    }
    messageBlock.payload[0].text += `\n\n${specialKeyText(HOME_KEY)}`
    return messageBlock
  } catch (err) {
    const message = err || 'Unable to get flight schedules'
    logger.serverLog(message, `${TAG}: getFlightSchedulesBlock`, {}, {chatbot, backId, argument, userInput}, 'error')
    throw new Error(`${DEFAULT_ERROR_MESSAGE}`)
  }
}

const getFlightScheduleDetailsBlock = (chatbot, backId, argument) => {
  try {
    // departure date in argument.departure_date
    // departure city in arugment.departure_city
    // arrival city in argument.arrival_city
    const flightInfo = argument.flight
    let messageBlock = {
      module: {
        id: chatbot._id,
        type: 'whatsapp_airlines_chatbot'
      },
      title: 'Get Flight Schedule Details',
      uniqueId: '' + new Date().getTime(),
      payload: [
        {
          text: dedent(`Details for ${flightInfo.airline.name} ${flightInfo.flight.iata}:\n`),
          componentType: 'text',
          specialKeys: {
            [BACK_KEY]: { type: STATIC, blockId: backId },
            [HOME_KEY]: { type: STATIC, blockId: chatbot.startingBlockId }
          }
        }
      ],
      userId: chatbot.userId,
      companyId: chatbot.companyId
    }
    messageBlock.payload[0].text += `\n*Flight Number*: ${flightInfo.flight.iata}`
    messageBlock.payload[0].text += `\n*Flight Status*: ${flightInfo.flight_status}`
    messageBlock.payload[0].text += `\n*Departure Time*: ${new Date(flightInfo.departure.scheduled).toLocaleString('en-US', {timeZone: flightInfo.departure.timezone, dateStyle: 'full', timeStyle: 'full'})}`
    messageBlock.payload[0].text += `\n*Arrival Time*: ${new Date(flightInfo.arrival.scheduled).toLocaleString('en-US', {timeZone: flightInfo.arrival.timezone, dateStyle: 'full', timeStyle: 'full'})}`
    messageBlock.payload[0].text += `\n*Departure Airport*: ${flightInfo.departure.airport}`
    messageBlock.payload[0].text += `\n*Departure Airport Location*: https://www.google.com/maps/search/?api=1&query=${escape(flightInfo.departure.airport)}`
    messageBlock.payload[0].text += `\n*Arrival Airport*: ${flightInfo.arrival.airport}`
    messageBlock.payload[0].text += `\n*Arrival Airport Location*: https://www.google.com/maps/search/?api=1&query=${escape(flightInfo.arrival.airport)}`

    messageBlock.payload[0].text += `\n\n${specialKeyText(BACK_KEY)}`
    messageBlock.payload[0].text += `\n${specialKeyText(HOME_KEY)}`
    return messageBlock
  } catch (err) {
    const message = err || 'Unable to get flight schedule details'
    logger.serverLog(message, `${TAG}: getFlightScheduleDetailsBlock`, {}, {chatbot, backId, argument}, 'error')
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
            messageBlock = await getSelectAirlineBlock(chatbot, contact.lastMessageSentByBot.uniqueId, AirlineProvider)
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
          case GET_FLIGHT_SCHEDULES: {
            messageBlock = await getFlightSchedulesBlock(chatbot, contact.lastMessageSentByBot.uniqueId, AirlineProvider, action.input ? input : '', action.argument)
            break
          }
          case ASK_AIRPORT_NAME: {
            messageBlock = await getAskAirportNameBlock(chatbot)
            break
          }
          case GET_AIRPORT_INFO: {
            messageBlock = await getAirportInfoBlock(chatbot, contact.lastMessageSentByBot.uniqueId, AirlineProvider, action.input ? input : '')
            break
          }
          case ASK_FLIGHT_NUMBER: {
            messageBlock = await getAskFlightNumberBlock(chatbot)
            break
          }
          case GET_FLIGHT_STATUS: {
            messageBlock = await getFlightStatusBlock(chatbot, contact.lastMessageSentByBot.uniqueId, AirlineProvider, action.input ? input : '')
            break
          }
          case GET_FLIGHT_SCHEDULE_DETAILS: {
            messageBlock = await getFlightScheduleDetailsBlock(chatbot, contact.lastMessageSentByBot.uniqueId, action.argument)
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

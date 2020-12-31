const dedent = require('dedent-js')
const {
  DYNAMIC,
  STATIC,
  FAQS_KEY,
  BACK_KEY,
  HOME_KEY,
  ERROR_INDICATOR,
  SELECT_AIRLINE,
  ASK_AIRPORT,
  ASK_DEPARTURE_DATE,
  ASK_DEPARTURE_CITY,
  ASK_ARRIVAL_CITY,
  ASK_FLIGHT_NUMBER,
  GET_FLIGHT_SCHEDULES,
  GET_AIRPORT_INFO,
  GET_FLIGHT_STATUS,
  GET_FLIGHT_SCHEDULE_DETAILS,
  TALK_TO_AGENT_KEY,
  TALK_TO_AGENT
} = require('./constants')
const { convertToEmoji, sendTalkToAgentNotification } = require('./whatsAppChatbot.logiclayer')
const logger = require('../../../components/logger')
const TAG = 'api/v1️.1/whatsAppChatbot/airlinesChatbot.logiclayer.js'
const messageBlockDataLayer = require('../messageBlock/messageBlock.datalayer')
const moment = require('moment')
const airlinesUtil = require('./../airlinesProvidersApiLayer/util')

const config = require('../../../config/environment/index')
const currencyConverter = require('currency-converter')({ CLIENTKEY: config.openExchangeRateKey })

const DEFAULT_ERROR_MESSAGE = `${ERROR_INDICATOR}Something went wrong! Please try again or send "Hi" to go back home.`

const dateTimeOptions = {
  timeZoneName: 'short',
  weekday: 'long',
  year: 'numeric',
  month: 'long',
  day: 'numeric',
  hour: 'numeric',
  minute: 'numeric'
}

function specialKeyText (key) {
  switch (key) {
    case TALK_TO_AGENT_KEY:
      return `Send '${key.toUpperCase()}' to talk to a customer support agent`
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
  const faqsId = '' + new Date().getTime() + 100

  messageBlocks.push({
    module: {
      id: chatbot._id,
      type: 'whatsapp_airlines_chatbot'
    },
    title: 'Main Menu',
    uniqueId: mainMenuId,
    payload: [
      {
        text: dedent(`Please select an option by sending the corresponding number for it (e.g. send '1' to select "Get flight schedules"):\n
                ${convertToEmoji(0)} Get flight status   
                ${convertToEmoji(1)} Get flight schedules\n
                ${specialKeyText(TALK_TO_AGENT_KEY)}`),
        componentType: 'text',
        menu: [
          { type: DYNAMIC, action: SELECT_AIRLINE, argument: {purpose: GET_FLIGHT_STATUS} },
          { type: DYNAMIC, action: SELECT_AIRLINE, argument: {purpose: GET_FLIGHT_SCHEDULES} }
        ]
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

const getTalkToAgentBlock = (chatbot, backId, contact) => {
  try {
    const messageBlock = {
      module: {
        id: chatbot._id,
        type: 'whatsapp_airlines_chatbot'
      },
      title: 'FAQs',
      uniqueId: '' + new Date().getTime(),
      payload: [
        {
          text: dedent(`Our support agents have been notified and will get back to you shortly\n
                      ${specialKeyText(HOME_KEY)}`),
          componentType: 'text',
          specialKeys: {
            [HOME_KEY]: { type: STATIC, blockId: chatbot.startingBlockId }
          }
        }
      ],
      userId: chatbot.userId,
      companyId: chatbot.companyId
    }
    sendTalkToAgentNotification(contact, chatbot.companyId)
    return messageBlock
  } catch (err) {
    const message = err || 'Unable get talk to agent message block'
    logger.serverLog(message, `${TAG}: getTalkToAgentBlock`, {}, {chatbot, backId, contact}, 'error')
    throw new Error(`${ERROR_INDICATOR}Unable to notify customer support agent`)
  }
}

const getAskFlightNumberBlock = (chatbot, backId, argument, userInput) => {
  let userError = false
  try {
    if (new Date(userInput).toString() === 'Invalid Date') {
      userError = true
      throw new Error('Please enter a valid date in the format of YYYY-MM-DD')
    } else if (new Date(userInput).toDateString() !== new Date().toDateString() && new Date(userInput) < new Date()) {
      userError = true
      throw new Error('Date should not be in the past')
    }
    let messageBlock = {
      module: {
        id: chatbot._id,
        type: 'whatsapp_airlines_chatbot'
      },
      title: 'Ask Flight Number',
      uniqueId: '' + new Date().getTime(),
      payload: [
        {
          text: `Please enter the flight number or send 'S' to skip`,
          componentType: 'text',
          specialKeys: {
            's': { type: DYNAMIC, action: GET_FLIGHT_SCHEDULES, argument: {...argument, departureDate: userInput} },
            [BACK_KEY]: { type: STATIC, blockId: backId },
            [HOME_KEY]: { type: STATIC, blockId: chatbot.startingBlockId }
          }
        }
      ],
      userId: chatbot.userId,
      companyId: chatbot.companyId
    }
    messageBlock.payload[0].text += `\n\n${specialKeyText(BACK_KEY)}`
    messageBlock.payload[0].text += `\n${specialKeyText(HOME_KEY)}`
    return messageBlock
  } catch (err) {
    if (!userError) {
      const message = err || 'Unable to get Ask Flight Number block'
      logger.serverLog(message, `${TAG}: getAskFlightNumberBlock`, {}, {chatbot}, 'error')
    }
    if (err.message) {
      throw new Error(`${ERROR_INDICATOR}${err.message}`)
    } else {
      throw new Error(`${DEFAULT_ERROR_MESSAGE}`)
    }
  }
}

const getFlightStatusBlock = async (chatbot, backId, AirlineProvider, argument, userInput) => {
  const flightInfo = argument.flight
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
          text: ``,
          componentType: 'text',
          specialKeys: {
            'r': {type: DYNAMIC, action: GET_FLIGHT_STATUS, argument: {...argument, backId: argument.backId ? argument.backId : backId}},
            [BACK_KEY]: { type: STATIC, blockId: argument.backId ? argument.backId : backId },
            [HOME_KEY]: { type: STATIC, blockId: chatbot.startingBlockId }
          }
        }
      ],
      userId: chatbot.userId,
      companyId: chatbot.companyId
    }
    const flightStatus = await AirlineProvider.fetchFlightByNumber(flightInfo.flight.iata, argument.airline.iata_code, argument.departureDate)
    if (flightStatus) {
      const airports = flightInfo.airports
      messageBlock.payload[0].text += `Here is flight status for *${flightInfo.airline.name} ${flightInfo.flight.iata}*:\n`

      messageBlock.payload[0].text += `\n*Scheduled Departure Time*: ${new Date(airports[0].departure.scheduled).toLocaleString('en-US', {timeZone: airports[0].departure.timezone, ...dateTimeOptions})}`
      let departureDelay
      if (flightStatus && flightStatus[0] && flightStatus[0].flightPoints) {
        const flightPoints = flightStatus[0].flightPoints
        const delays = flightPoints[0].departure.timings[0].delays
        if (delays && delays[0] && delays[0].duration) {
          departureDelay = moment.duration(delays[0].duration)
          for (let i = 1; i < delays.length; i++) {
            departureDelay = departureDelay.add(delays[i].duration.toString())
          }
        }
      }
      messageBlock.payload[0].text += `\n*Expected Departure Delay*: ${departureDelay ? departureDelay.locale('en').humanize() : 'No delay'}`
      if (departureDelay) {
        const expectedDepartureDate = moment(airports[0].departure.scheduled).add(departureDelay.toString()).toDate()
        messageBlock.payload[0].text += `\n*Expected Departure Time*: ${new Date(expectedDepartureDate).toLocaleString('en-US', {timeZone: airports[0].departure.timezone, ...dateTimeOptions})}`
      }
      messageBlock.payload[0].text += `\n`

      messageBlock.payload[0].text += `\n*Scheduled Arrival Time*: ${new Date(airports[0].arrival.scheduled).toLocaleString('en-US', {timeZone: airports[0].arrival.timezone, ...dateTimeOptions})}`
      let arrivalDelay
      if (flightStatus && flightStatus[0] && flightStatus[0].flightPoints) {
        const flightPoints = flightStatus[0].flightPoints
        const delays = flightPoints[flightPoints.length - 1].arrival.timings[0].delays
        if (delays && delays[0] && delays[0].duration) {
          arrivalDelay = moment.duration(delays[0].duration)
          for (let i = 1; i < delays.length; i++) {
            arrivalDelay = arrivalDelay.add(delays[i].duration.toString())
          }
        }
      }
      messageBlock.payload[0].text += `\n*Expected Arrival Delay*: ${arrivalDelay ? arrivalDelay.locale('en').humanize() : 'No delay'}`
      if (arrivalDelay) {
        const expectedArrivalDate = moment(airports[airports.length - 1].arrival.scheduled).add(arrivalDelay.toString()).toDate()
        messageBlock.payload[0].text += `\n*Expected Arrival Time*: ${new Date(expectedArrivalDate).toLocaleString('en-US', {timeZone: airports[airports.length - 1].arrival.timezone, ...dateTimeOptions})}`
      }
      messageBlock.payload[0].text += `\n`

      messageBlock.payload[0].text += `\n*Departure Airport*: ${airports[0].departure.airport['Airport name']}`
      messageBlock.payload[0].text += `\n*Departure Airport Location*: https://www.google.com/maps/search/?api=1&query=${encodeURI(airports[0].departure.airport['Airport name'])}\n`
      messageBlock.payload[0].text += `\n*Arrival Airport*: ${airports[0].arrival.airport['Airport name']}`
      messageBlock.payload[0].text += `\n*Arrival Airport Location*: https://www.google.com/maps/search/?api=1&query=${encodeURI(airports[0].arrival.airport['Airport name'])}`
    } else {
      messageBlock.payload[0].text += `No flight status info found for ${flightInfo.airline.name} ${flightInfo.flight.iata}`
    }
    messageBlock.payload[0].text += `\n\nSend 'R' to Refresh`
    messageBlock.payload[0].text += `\n${specialKeyText(BACK_KEY)}`
    messageBlock.payload[0].text += `\n${specialKeyText(HOME_KEY)}`
    return messageBlock
  } catch (err) {
    const message = err || 'Unable to get flight status'
    logger.serverLog(message, `${TAG}: getFlightStatus`, {}, {chatbot}, 'error')
    throw new Error(`${ERROR_INDICATOR} Unable to get flight status for ${flightInfo.airline.name} ${flightInfo.flight.iata}`)
  }
}

const getAskAirportBlock = (chatbot) => {
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
          text: `Please enter city name, airport code, or city code`,
          componentType: 'text',
          action: { type: DYNAMIC, action: GET_AIRPORT_INFO, input: true },
          specialKeys: {
            [HOME_KEY]: { type: STATIC, blockId: chatbot.startingBlockId }
          }
        }
      ],
      userId: chatbot.userId,
      companyId: chatbot.companyId
    }
    messageBlock.payload[0].text += `\n\n${specialKeyText(HOME_KEY)}`
    return messageBlock
  } catch (err) {
    const message = err || 'Unable to get Ask Airport block'
    logger.serverLog(message, `${TAG}: exports.getAskAirportBlock`, {}, {chatbot}, 'error')
    throw new Error(`${DEFAULT_ERROR_MESSAGE}`)
  }
}

const getAirportInfoBlock = async (chatbot, backId, AirlineProvider, userInput) => {
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
          specialKeys: {
            [BACK_KEY]: { type: STATIC, blockId: backId },
            [HOME_KEY]: { type: STATIC, blockId: chatbot.startingBlockId }
          }
        }
      ],
      userId: chatbot.userId,
      companyId: chatbot.companyId
    }
    const airports = await AirlineProvider.fetchAirportInfo(userInput)

    if (airports.length > 0) {
      messageBlock.payload[0].text += `*Airports found for ${userInput.toUpperCase()}*:\n`
    }

    for (let i = 0; i < airports.length; i++) {
      const airportInfo = airports[i]
      messageBlock.payload[0].text += `\n*Airport Name*: ${airportInfo.airport_name}\n`
      messageBlock.payload[0].text += `*Location*: https://www.google.com/maps/search/?api=1&query=${airportInfo.latitude},${airportInfo.longitude}`
      if (i < airports.length - 1) {
        messageBlock.payload[0].text += `\n`
      }
    }
    if (airports.length === 0) {
      messageBlock.payload[0].text += `No airports found for ${userInput.toUpperCase()}`
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

const getSelectAirlineBlock = async (chatbot, backId, AirlineProvider, argument) => {
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
        type: DYNAMIC, action: ASK_DEPARTURE_CITY, argument: {...argument, airline}
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

const getAskDepartureCityBlock = async (chatbot, backId, argument, userInput) => {
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
          text: '',
          componentType: 'text',
          action: { type: DYNAMIC, action: ASK_ARRIVAL_CITY, input: true, argument: {...argument} },
          specialKeys: {
            [BACK_KEY]: { type: STATIC, blockId: backId },
            [HOME_KEY]: { type: STATIC, blockId: chatbot.startingBlockId }
          }
        }
      ],
      userId: chatbot.userId,
      companyId: chatbot.companyId
    }
    if (argument && argument.airline) {
      messageBlock.payload[0].text += `You have selected ${argument.airline.airline_name}\n\n`
    }
    messageBlock.payload[0].text += 'Please enter your departure city'

    messageBlock.payload[0].text += `\n\n${specialKeyText(BACK_KEY)}`
    messageBlock.payload[0].text += `\n${specialKeyText(HOME_KEY)}`
    return messageBlock
  } catch (err) {
    const message = err || 'Unable to get Ask Departure City block'
    logger.serverLog(message, `${TAG}: exports.getAskDepartureCityBlock`, {}, {chatbot, argument, userInput}, 'error')
    throw new Error(`${DEFAULT_ERROR_MESSAGE}`)
  }
}

const getAskArrivalCityBlock = async (chatbot, backId, AirlineProvider, argument, userInput) => {
  let userError = false
  try {
    const nextArgument = {...argument}
    const cityInfo = await AirlineProvider.fetchCityInfo(userInput)
    if (cityInfo.length === 0) {
      userError = true
      let titleCaseCity = userInput.split(' ').map(w => w[0].toUpperCase() + w.substr(1).toLowerCase()).join(' ')
      throw new Error(`No city found for ${titleCaseCity}`)
    } else {
      nextArgument.departureCityInfo = cityInfo
      nextArgument.departureCity = userInput
    }
    let messageBlock = {
      module: {
        id: chatbot._id,
        type: 'whatsapp_airlines_chatbot'
      },
      title: 'Ask Arrival City',
      uniqueId: '' + new Date().getTime(),
      payload: [
        {
          text: `Please enter your arrival city`,
          componentType: 'text',
          action: { type: DYNAMIC, action: ASK_DEPARTURE_DATE, input: true, argument: nextArgument },
          specialKeys: {
            [BACK_KEY]: { type: STATIC, blockId: backId },
            [HOME_KEY]: { type: STATIC, blockId: chatbot.startingBlockId }
          }
        }
      ],
      userId: chatbot.userId,
      companyId: chatbot.companyId
    }
    messageBlock.payload[0].text += `\n\n${specialKeyText(BACK_KEY)}`
    messageBlock.payload[0].text += `\n${specialKeyText(HOME_KEY)}`
    return messageBlock
  } catch (err) {
    if (userError && err.message) {
      throw new Error(`${ERROR_INDICATOR}${err.message}`)
    } else {
      const message = err || 'Unable to get Ask Arrival City Block'
      logger.serverLog(message, `${TAG}: exports.getAskArrivalCityBlock`, {}, {chatbot, argument, userInput}, 'error')
      throw new Error(`${DEFAULT_ERROR_MESSAGE}`)
    }
  }
}

const getAskDepartureDateBlock = async (chatbot, backId, AirlineProvider, argument, userInput) => {
  let userError = false
  try {
    const nextArgument = {...argument}
    const cityInfo = await AirlineProvider.fetchCityInfo(userInput)
    if (cityInfo.length === 0) {
      userError = true
      let titleCaseCity = userInput.split(' ').map(w => w[0].toUpperCase() + w.substr(1).toLowerCase()).join(' ')
      throw new Error(`No city found for ${titleCaseCity}`)
    } else {
      nextArgument.arrivalCityInfo = cityInfo
      nextArgument.arrivalCity = userInput
    }
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
          action: { type: DYNAMIC, action: ASK_FLIGHT_NUMBER, input: true, argument: nextArgument },
          specialKeys: {
            [BACK_KEY]: { type: STATIC, blockId: backId },
            [HOME_KEY]: { type: STATIC, blockId: chatbot.startingBlockId }
          }
        }
      ],
      userId: chatbot.userId,
      companyId: chatbot.companyId
    }
    messageBlock.payload[0].text += 'Please enter your departure date in the format of YYYY-MM-DD'

    messageBlock.payload[0].text += `\n\n${specialKeyText(BACK_KEY)}`
    messageBlock.payload[0].text += `\n${specialKeyText(HOME_KEY)}`
    return messageBlock
  } catch (err) {
    if (userError && err.message) {
      throw new Error(`${ERROR_INDICATOR}${err.message}`)
    } else {
      const message = err || 'Unable to get Ask Departure Date block'
      logger.serverLog(message, `${TAG}: exports.getSelectAirlineBlock`, {}, {chatbot, argument, userInput}, 'error')
      throw new Error(`${DEFAULT_ERROR_MESSAGE}`)
    }
  }
}

const getFlightSchedulesBlock = async (chatbot, backId, AirlineProvider, argument, userInput) => {
  let userError = false
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
    argument.flightNumber = userInput
    const departureCity = argument.departureCityInfo[0]['iata_code']
    const arrivalCity = argument.arrivalCityInfo[0]['iata_code']
    const airline = argument.airline ? argument.airline.iata_code : null
    let flights = await AirlineProvider.fetchFlights(departureCity, arrivalCity, argument.departureDate, airline, argument.flightNumber)

    if (flights.length === 0) {
      messageBlock.payload[0].text += `No Flights found\n`
    } else {
      messageBlock.payload[0].text += `Select a flight by sending the corresponding number for it:\n`
      flights = flights.filter(f => f.flight && f.flight.iata)
      flights = flights.slice(0, 10)
    }
    for (let i = 0; i < flights.length; i++) {
      const flight = flights[i]
      const airports = flight.airports
      messageBlock.payload[0].text += `\n${convertToEmoji(i)} ${flight.airline.name} ${flight.flight.iata}`
      if (airports.length > 1) {
        messageBlock.payload[0].text += `\n*This is a connecting flight with ${airports.length} flights*:`
      } else {
        messageBlock.payload[0].text += `\n*This is a direct flight*:`
      }
      messageBlock.payload[0].text += `\n*Scheduled Departure Time*: ${new Date(flight.airports[0].departure.scheduled).toLocaleString('en-US', {timeZone: flight.airports[0].departure.timezone, ...dateTimeOptions})}`
      messageBlock.payload[0].text += `\n*Scheduled Arrival Time*: ${new Date(flight.airports[flight.airports.length - 1].arrival.scheduled).toLocaleString('en-US', {timeZone: flight.airports[flight.airports.length - 1].arrival.timezone, ...dateTimeOptions})}`

      if (argument.purpose === GET_FLIGHT_SCHEDULES) {
        const priceInUSD = await currencyConverter.convert(Number(flight.price.amount), flight.price.currency, 'USD')
        messageBlock.payload[0].text += `\n*Price*: ${priceInUSD.amount} USD`
        messageBlock.payload[0].menu.push({type: DYNAMIC, action: GET_FLIGHT_SCHEDULE_DETAILS, argument: {...argument, flight}})
      } else if (argument.purpose === GET_FLIGHT_STATUS) {
        messageBlock.payload[0].menu.push({type: DYNAMIC, action: GET_FLIGHT_STATUS, argument: {...argument, flight}})
      }
      if (i + 1 < flights.length) {
        messageBlock.payload[0].text += `\n`
      }
    }

    messageBlock.payload[0].text += `\n\n${specialKeyText(BACK_KEY)}`
    messageBlock.payload[0].text += `\n${specialKeyText(HOME_KEY)}`
    return messageBlock
  } catch (err) {
    if (!userError) {
      const message = err || 'Unable to get flight schedules'
      logger.serverLog(message, `${TAG}: getFlightSchedulesBlock`, {}, {chatbot, backId, argument, userInput}, 'error')
    }
    if (err.message && userError) {
      throw new Error(`${ERROR_INDICATOR}${err.message}`)
    } else {
      throw new Error(`${DEFAULT_ERROR_MESSAGE}`)
    }
  }
}

const getFlightScheduleDetailsBlock = async (chatbot, backId, argument) => {
  try {
    // departure date in argument.departureDate
    // departure city in arugment.departureCity
    // arrival city in argument.arrivalCity
    // optional flight number in argument.flightNumber
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
          text: dedent(`Details for *${flightInfo.airline.name} ${flightInfo.flight.iata}*:\n\n`),
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
    const airports = flightInfo.airports
    if (airports.length > 1) {
      messageBlock.payload[0].text += `\n*This is a connecting flight with ${airports.length} flights*:`
    } else {
      messageBlock.payload[0].text += `\n*This is a direct flight*:`
    }
    for (let i = 0; i < airports.length; i++) {
      const airport = airports[i]
      if (airports.length > 1) {
        messageBlock.payload[0].text += `\n*Flight #${i + 1}*:`
      }
      messageBlock.payload[0].text += `\n*Flight Number*: ${airport.flight_number}`
      messageBlock.payload[0].text += `\n*Scheduled Departure Time*: ${new Date(airport.departure.scheduled).toLocaleString('en-US', {timeZone: airport.departure.timezone, ...dateTimeOptions})}`
      if (airport.departure.airport) {
        messageBlock.payload[0].text += `\n*Departure Airport*: ${airport.departure.airport['Airport name']}`
        messageBlock.payload[0].text += `\n*Departure Airport Location*: https://www.google.com/maps/search/?api=1&query=${encodeURI(airport.departure.airport['Airport name'])}`
      }
      messageBlock.payload[0].text += `\n*Scheduled Arrival Time*: ${new Date(airport.arrival.scheduled).toLocaleString('en-US', {timeZone: airport.arrival.timezone, ...dateTimeOptions})}`
      if (airport.arrival.airport) {
        messageBlock.payload[0].text += `\n*Arrival Airport*: ${airport.arrival.airport['Airport name']}`
        messageBlock.payload[0].text += `\n*Arrival Airport Location*: https://www.google.com/maps/search/?api=1&query=${encodeURI(airport.arrival.airport['Airport name'])}`
      }
      messageBlock.payload[0].text += `\n`
    }
    const priceInUSD = await currencyConverter.convert(Number(flightInfo.price.amount), flightInfo.price.currency, 'USD')
    messageBlock.payload[0].text += `\n*Price*: ${priceInUSD.amount} USD`

    const departureDate = new Date(airports[0].departure.scheduled).toLocaleDateString('en-CA')
    const departureCityWeather = await airlinesUtil.findWeatherInfo(argument.departureCity, departureDate)
    const titleCaseDepartureCity = argument.departureCity.split(' ').map(w => w[0].toUpperCase() + w.substr(1).toLowerCase()).join(' ')
    messageBlock.payload[0].text += `\n*Weather in ${titleCaseDepartureCity} at departure date*: ${departureCityWeather.main} (${departureCityWeather.description})`

    const arrivalDate = new Date(airports[airports.length - 1].arrival.scheduled).toLocaleDateString('en-CA')
    const arrivalCityWeather = await airlinesUtil.findWeatherInfo(argument.arrivalCity, arrivalDate)
    const titleCaseArrivalCity = argument.arrivalCity.split(' ').map(w => w[0].toUpperCase() + w.substr(1).toLowerCase()).join(' ')
    messageBlock.payload[0].text += `\n*Weather in ${titleCaseArrivalCity} at arrival date*: ${arrivalCityWeather.main} (${arrivalCityWeather.description})`

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
    welcomeMessage += ` Welcome back to Kibo flights chatbot! 🛫`
  } else {
    welcomeMessage += ` Welcome to Kibo flights chatbot! 🛫`
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
      if (chatbot.triggers.includes(input) ||
        (lastMessageSentByBot.menu && lastMessageSentByBot.menu.length === 0 && !lastMessageSentByBot.action) ||
        (moment().diff(moment(contact.lastMessagedAt), 'minutes') >= 15 && chatbot.companyId !== '5a89ecdaf6b0460c552bf7fe')) {
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
            messageBlock = await getSelectAirlineBlock(chatbot, contact.lastMessageSentByBot.uniqueId, AirlineProvider, action.argument)
            break
          }
          case ASK_DEPARTURE_DATE: {
            messageBlock = await getAskDepartureDateBlock(chatbot, contact.lastMessageSentByBot.uniqueId, AirlineProvider, action.argument, action.input ? input : '')
            break
          }
          case ASK_DEPARTURE_CITY: {
            messageBlock = await getAskDepartureCityBlock(chatbot, contact.lastMessageSentByBot.uniqueId, action.argument, action.input ? input : '')
            break
          }
          case ASK_ARRIVAL_CITY: {
            messageBlock = await getAskArrivalCityBlock(chatbot, contact.lastMessageSentByBot.uniqueId, AirlineProvider, action.argument, action.input ? input : '')
            break
          }
          case GET_FLIGHT_SCHEDULES: {
            messageBlock = await getFlightSchedulesBlock(chatbot, contact.lastMessageSentByBot.uniqueId, AirlineProvider, action.argument, action.input ? input : '')
            break
          }
          case ASK_AIRPORT: {
            messageBlock = await getAskAirportBlock(chatbot)
            break
          }
          case GET_AIRPORT_INFO: {
            messageBlock = await getAirportInfoBlock(chatbot, contact.lastMessageSentByBot.uniqueId, AirlineProvider, action.input ? input : '')
            break
          }
          case ASK_FLIGHT_NUMBER: {
            messageBlock = await getAskFlightNumberBlock(chatbot, contact.lastMessageSentByBot.uniqueId, action.argument, action.input ? input : '')
            break
          }
          case GET_FLIGHT_STATUS: {
            messageBlock = await getFlightStatusBlock(chatbot, contact.lastMessageSentByBot.uniqueId, AirlineProvider, action.argument, action.input ? input : '')
            break
          }
          case GET_FLIGHT_SCHEDULE_DETAILS: {
            messageBlock = await getFlightScheduleDetailsBlock(chatbot, contact.lastMessageSentByBot.uniqueId, action.argument)
            break
          }
          case TALK_TO_AGENT: {
            messageBlock = await getTalkToAgentBlock(chatbot, contact.lastMessageSentByBot.uniqueId, contact)
            break
          }
        }
        await messageBlockDataLayer.createForMessageBlock(messageBlock)
        return messageBlock
      } catch (err) {
        if (chatbot.triggers.includes(input) || moment().diff(moment(contact.lastMessagedAt), 'minutes') >= 15) {
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

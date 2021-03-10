/**
 * Created by sojharo on 30/11/2020.
 */

const logger = require('../../../components/logger')
const TAG = 'api/airlines/airlines.controller.js'
const config = require('./../../../config/environment/index')
const dataLayer = require('./../whatsAppChatbot/whatsAppChatbot.datalayer')
const AirlinesProviders = require('./../airlinesProvidersApiLayer/AirlineProvidersApiLayer.js')
const airlinesConstants = require('./../airlinesProvidersApiLayer/constants')
const { sendSuccessResponse, sendErrorResponse } = require('../../global/response')

exports.fetchChatbot = (req, res) => {
  dataLayer.fetchWhatsAppChatbot({companyId: req.user.copmanyId, vertical: 'airlines', type: 'automated'})
    .then(chatbot => {
      sendSuccessResponse(res, 200, chatbot)
    })
    .catch(err => {
      const message = err || 'Failed to fetch chatbot record'
      logger.serverLog(message, `${TAG}: exports.fetchChatbot`, {}, {user: req.user}, 'error')
      sendErrorResponse(res, 500, `Failed to fetch chatbot record ${JSON.stringify(err)}`)
    })
}

exports.testRoute = async (req, res) => {
  try {
    // const aviation = new AirlinesProviders(airlinesConstants.aviation, {
    //   access_key: config.aviationKey
    // })
    // const result = await aviation.fetchFlightByNumber('pa204')
    const amadeus = new AirlinesProviders(airlinesConstants.amadeus, {
      clientId: config.amadeus.clientId,
      clientSecret: config.amadeus.clientSecret
    })
    const result = await amadeus.fetchFlights('NYC', 'SEA', '2021-01-19', 'UA')
    // const result = await amadeus.fetchFlightByNumber('1790', 'UA', '2020-12-29')
    // const result = await amadeus.fetchAirportInfo('Karachi')
    // const result = await require('./../airlinesProvidersApiLayer/util').findWeatherInfo('Karachi', '2020-12-16')
    sendSuccessResponse(res, 200, result)
  } catch (err) {
    console.log('THIS IS THE ERROR')
    console.log(err)
    sendErrorResponse(res, 500, `Failed to test aviation api endpoint ${JSON.stringify(err)}`)
    throw new Error(err)
  }
}

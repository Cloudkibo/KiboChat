const logger = require('../../../components/logger')
const TAG = '/api/v1/whatsAppEvents/logicLayer.js'
const { openGraphScrapper } = require('../../global/utility')
const whatsAppChatbotDataLayer = require('../whatsAppChatbot/whatsAppChatbot.datalayer')
const whatsAppChatbotAnalyticsDataLayer = require('../whatsAppChatbot/whatsAppChatbot_analytics.datalayer')
const moment = require('moment')

exports.prepareChat = (from, to, contact, body, format) => {
  return new Promise(function (resolve, reject) {
    let MessageObject = {
      senderNumber: from,
      recipientNumber: to,
      contactId: contact._id,
      companyId: contact.companyId,
      payload: body,
      status: 'unseen',
      format
    }
    getMetaData(MessageObject)
      .then(result => {
        resolve(result)
      })
      .catch(err => {
        if (!(err && err === 'Page Not Found')) {
          reject(err)
        } else {
          resolve(MessageObject)
        }
      })
  })
}

function getmetaurl (text) {
  /* eslint-disable */
  var urlRegex = /(\b(https?|ftp|file):\/\/[-A-Z0-9+&@#\/%?=~_|!:,.;]*[-A-Z0-9+&@#\/%=~_|])/ig
  /* eslint-enable */
  var onlyUrl = ''
  if (text) {
    var testUrl = text.match(urlRegex)
    onlyUrl = testUrl && testUrl[0]
  }
  return onlyUrl
}

function getMetaData (body) {
  return new Promise(function (resolve, reject) {
    if (body.payload.componentType === 'text') {
      let isUrl = getmetaurl(body.payload.text)
      if (isUrl) {
        openGraphScrapper(isUrl)
          .then(meta => {
            body.url_meta = meta
            resolve(body)
          })
          .catch((err) => {
            reject(err)
          })
      } else {
        resolve(body)
      }
    } else {
      resolve(body)
    }
  })
}

exports.storeWhatsAppStats = async function (data, chatbot, isNewContact, contact, req) {
  const triggerWordsMatched = chatbot.triggers.includes(data.messageData.text.toLowerCase()) ? 1 : 0

  if (isNewContact) {
    await whatsAppChatbotDataLayer.updateWhatsAppChatbot({_id: chatbot._id}, { $inc: { 'stats.triggerWordsMatched': triggerWordsMatched, 'stats.newSubscribers': 1 } })
    whatsAppChatbotAnalyticsDataLayer.genericUpdateBotAnalytics(
      { chatbotId: chatbot._id, companyId: chatbot.companyId, dateToday: moment(new Date()).format('YYYY-MM-DD') },
      { $inc: { sentCount: 1, newSubscribersCount: 1, triggerWordsMatched } },
      { upsert: true })
      .then(updated => {})
      .catch(err => {
        const message = err || 'Failed to update WhatsApp chatbot analytics'
        logger.serverLog(message, `${TAG}: exports.messageReceived`, req.body, {chatbotId: chatbot._id, companyId: chatbot.companyId}, 'error')
      })
  } else {
    whatsAppChatbotDataLayer.updateWhatsAppChatbot({_id: chatbot._id}, { $inc: { 'stats.triggerWordsMatched': triggerWordsMatched } })
    let subscriberLastMessageAt = moment(contact.lastMessagedAt)
    let dateNow = moment()
    if (dateNow.diff(subscriberLastMessageAt, 'days') >= 1) {
      whatsAppChatbotAnalyticsDataLayer.genericUpdateBotAnalytics(
        { chatbotId: chatbot._id, companyId: chatbot.companyId, dateToday: moment(new Date()).format('YYYY-MM-DD') },
        { $inc: { sentCount: 1, returningSubscribers: 1, triggerWordsMatched } },
        { upsert: true })
        .then(updated => {})
        .catch(err => {
          const message = err || 'Failed to update WhatsApp chatbot analytics'
          logger.serverLog(message, `${TAG}: exports.messageReceived`, req.body, {chatbotId: chatbot._id, companyId: chatbot.companyId}, 'error')
        })
    } else {
      whatsAppChatbotAnalyticsDataLayer.genericUpdateBotAnalytics(
        { chatbotId: chatbot._id, companyId: chatbot.companyId, dateToday: moment(new Date()).format('YYYY-MM-DD') },
        { $inc: { sentCount: 1, triggerWordsMatched } },
        { upsert: true })
        .then(updated => {})
        .catch(err => {
          const message = err || 'Failed to update WhatsApp chatbot analytics'
          logger.serverLog(message, `${TAG}: exports.messageReceived`, req.body, {chatbotId: chatbot._id, companyId: chatbot.companyId}, 'error')
        })
    }
  }
}

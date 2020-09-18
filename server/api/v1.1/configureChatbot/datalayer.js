const { callApi } = require('../utility')
const { kibodash } = require('../../global/constants').serverConstants

exports.createChatbotRecord = (payload) => {
  return callApi(`chatbot`, 'post', payload, kibodash)
}

exports.updateChatbotRecord = (query, updated) => {
  return callApi(`chatbot`, 'put', {query, updated}, kibodash)
}

exports.fetchChatbotRecords = (query) => {
  return callApi(`chatbot/find`, 'post', query, kibodash)
}

exports.deleteChatbotRecord = (query) => {
  return callApi(`chatbot`, 'delete', query, kibodash)
}

exports.fetchChatbotBlockRecords = (query) => {
  return callApi(`chatbotBlock/find`, 'post', query, kibodash)
}

exports.createChatbotBlockRecord = (payload) => {
  return callApi(`chatbotBlock`, 'post', payload, kibodash)
}

exports.updateChatbotBlockRecord = (query, updated) => {
  return callApi(`chatbotBlock`, 'put', {query, updated}, kibodash)
}

exports.deleteChatbotBlockRecord = (query) => {
  return callApi(`chatbotBlock`, 'delete', query, kibodash)
}

const { sendSuccessResponse, sendErrorResponse } = require('../../global/response')
const {ActionTypes} = require('../../../whatsAppMapper/constants')
const { whatsAppMapper } = require('../../../whatsAppMapper/whatsAppMapper')
const { getSuperWhatsAppAccount } = require('../../global/utility')
const { callApi } = require('../utility')
const shopifyDataLayer = require('./../shopify/shopify.datalayer')
const commerceConstants = require('./../ecommerceProvidersApiLayer/constants')
const EcommerceProviders = require('./../ecommerceProvidersApiLayer/EcommerceProvidersApiLayer.js')
const logicLayer = require('./logiclayer')
const logger = require('../../../components/logger')
const TAG = 'api/superNumberPreferences/superNumberPreferences.controller.js'
const dataLayer = require('../superNumber/datalayer')
const analyticsDataLayer = require('./superNumberAnalytics.datalayer')
const widgetAnalyticsDataLayer = require('./superNumberWidgetAnalytics.datalayer')
const messageLogsDataLayer = require('./superNumberMessageLogs.datalayer')
const { saveAnalytics } = require('./utility')
const async = require('async')
const { getContact } = require('./../utility/miscApiCalls.controller')

exports.fetchTemplates = async (req, res) => {
  let superWhatsAppAccount = getSuperWhatsAppAccount()
  let templateMessage = whatsAppMapper(
    superWhatsAppAccount.provider,
    ActionTypes.GET_COMMERCE_TEMPLATES,
    {type: req.body.type, language: req.body.language})
  sendSuccessResponse(res, 200, templateMessage)
}

exports.sendManualMessage = async (req, res) => {
  try {
    let query = {
      companyId: req.user.companyId,
      $or: [
        {number: req.body.number},
        {number: req.body.number.replace(/\D/g, '')}
      ]
    }
    let contact = await callApi(`whatsAppContacts/query`, 'post', query)
    if (contact.length > 0 && contact[0].marketing_optin) {
      contact = contact[0]
      const shopifyIntegration = await shopifyDataLayer.findOneShopifyIntegration({ companyId: req.user.companyId })
      if (shopifyIntegration) {
        const shopify = new EcommerceProviders(commerceConstants.shopify, {
          shopUrl: shopifyIntegration.shopUrl,
          shopToken: shopifyIntegration.shopToken
        })
        const storeInfo = await shopify.fetchStoreInfo()
        let message = logicLayer.prepareManualMessage(req.body.templateName, req.body.template, contact, storeInfo.name, req.body.supportNumber, req.body.order, req.body.checkout)
        await whatsAppMapper(message.provider, ActionTypes.SEND_CHAT_MESSAGE, message)
        saveAnalytics(req.user.companyId, false, req.body.templateName)
        sendSuccessResponse(res, 200, 'Message sent successfully')
      } else {
        sendErrorResponse(res, 500, null, 'No Shopify Integration found')
      }
    } else {
      sendErrorResponse(res, 500, null, 'This customer has not opted-in.')
    }
  } catch (err) {
    const message = err || 'Internal server error'
    logger.serverLog(message, `${TAG}: exports.sendManualMessage`, req.body, {user: req.user}, 'error')
    sendErrorResponse(res, 500, null, 'Failed to send message')
  }
}

exports.index = function (req, res) {
  dataLayer.findOne({ companyId: req.user.companyId })
    .then(responses => {
      sendSuccessResponse(res, 200, responses)
    })
    .catch(err => {
      const message = err || 'Error occured while fetching responses'
      logger.serverLog(message, `${TAG}: exports.index`, {}, {user: req.user}, 'error')
      sendErrorResponse(res, 500, 'Error occured while fetching responses')
    })
}

exports.create = function (req, res) {
  var payload = {
    companyId: req.user.companyId,
    abandonedCart: req.body.abandonedCart,
    orderConfirmation: req.body.orderConfirmation,
    orderShipment: req.body.orderShipment,
    cashOnDelivery: req.body.cashOnDelivery,
    optin_widget: req.body.optin_widget
  }
  dataLayer.create(payload)
    .then(createdObj => {
      sendSuccessResponse(res, 200, createdObj)
    })
    .catch(err => {
      const message = err || 'Error occured while creating SuperNumberPreferences object'
      logger.serverLog(message, `${TAG}: exports.create`, req.body, {payload, user: req.user}, 'error')
      sendErrorResponse(res, 500, 'Error occured while creating SuperNumberPreferences object')
    })
}

exports.update = function (req, res) {
  let updatedObject = req.body
  dataLayer.update('updateOne', {companyId: req.user.companyId}, updatedObject)
    .then(updated => {
      sendSuccessResponse(res, 200, 'SuperNumberPreferences updated succssfully')
    })
    .catch(err => {
      const message = err || 'Error occured while updating SuperNumberPreferences'
      logger.serverLog(message, `${TAG}: exports.edit`, req.body, {user: req.user}, 'error')
      sendErrorResponse(res, 500, 'Error occured while SuperNumberPreferences')
    })
}

exports.delete = function (req, res) {
  dataLayer.deleteOne({ companyId: req.user.companyId })
    .then(deletedObj => {
      sendSuccessResponse(res, 200, 'SuperNumberPreferences deleted successfully!')
    })
    .catch(err => {
      const message = err || 'Error occured while deleting SuperNumberPreferences'
      logger.serverLog(message, `${TAG}: exports.delete`, req.body, {user: req.user}, 'error')
      sendErrorResponse(res, 500, 'Failed to delete SuperNumberPreferences.')
    })
}

exports.fetchSummarisedAnalytics = function (req, res) {
  async.parallelLimit([
    function (callback) {
      let {matchQuery, groupQuery} = logicLayer.summarisedAnalyticsQuery(req.body, req.user.companyId, 'contacts')
      callApi(`whatsAppContacts/aggregate`, 'post',
        [{$match: matchQuery}, {$group: groupQuery}])
        .then(contacts => {
          callback(null, contacts)
        })
        .catch(err => {
          callback(err)
        })
    },
    function (callback) {
      let {matchQuery, groupQuery} = logicLayer.summarisedAnalyticsQuery(req.body, req.user.companyId, 'analytics', true)
      analyticsDataLayer.aggregate(matchQuery, groupQuery)
        .then(result => {
          callback(null, result)
        })
        .catch(err => {
          callback(err)
        })
    },
    function (callback) {
      let {matchQuery, groupQuery} = logicLayer.summarisedAnalyticsQuery(req.body, req.user.companyId, 'analytics', false)
      analyticsDataLayer.aggregate(matchQuery, groupQuery)
        .then(result => {
          callback(null, result)
        })
        .catch(err => {
          callback(err)
        })
    }
  ], 10, function (err, results) {
    if (err) {
      const message = err || 'Error in fetching summarised analytics'
      logger.serverLog(message, `${TAG}: exports.fetchSummarisedAnalytics`, req.body, {user: req.user}, 'error')
      return res.status(500).json({status: 'failed', payload: err})
    } else {
      let contacts = results[0]
      let automated = results[1]
      let manual = results[2]
      contacts = contacts.length > 0 ? contacts[0].count : 0
      manual = manual.length > 0 ? manual[0].count : 0
      automated = automated.length > 0 ? automated[0].count : 0
      sendSuccessResponse(res, 200, {contacts, automated, manual})
    }
  })
}
exports.fetchDetailedAnalytics = function (req, res) {
  async.parallelLimit([
    function (callback) {
      let {matchQuery, groupQuery} = logicLayer.detailedAnalyticsQuery(req.body, req.user.companyId, req.body.automated, 'ORDER_CONFIRMATION')
      analyticsDataLayer.aggregate(matchQuery, groupQuery)
        .then(result => {
          callback(null, result)
        })
        .catch(err => {
          callback(err)
        })
    },
    function (callback) {
      let {matchQuery, groupQuery} = logicLayer.detailedAnalyticsQuery(req.body, req.user.companyId, req.body.automated, 'ORDER_SHIPMENT')
      analyticsDataLayer.aggregate(matchQuery, groupQuery)
        .then(result => {
          callback(null, result)
        })
        .catch(err => {
          callback(err)
        })
    },
    function (callback) {
      let {matchQuery, groupQuery} = logicLayer.detailedAnalyticsQuery(req.body, req.user.companyId, req.body.automated, 'ABANDONED_CART_RECOVERY')
      analyticsDataLayer.aggregate(matchQuery, groupQuery)
        .then(result => {
          callback(null, result)
        })
        .catch(err => {
          callback(err)
        })
    },
    function (callback) {
      let {matchQuery, groupQuery} = logicLayer.detailedAnalyticsQuery(req.body, req.user.companyId, req.body.automated, 'COD_ORDER_CONFIRMATION')
      analyticsDataLayer.aggregate(matchQuery, groupQuery)
        .then(result => {
          callback(null, result)
        })
        .catch(err => {
          callback(err)
        })
    }
  ], 10, function (err, results) {
    if (err) {
      const message = err || 'Error in fetching detailed analytics'
      logger.serverLog(message, `${TAG}: exports.fetchDetailedAnalytics`, req.body, {user: req.user}, 'error')
      return res.status(500).json({status: 'failed', payload: err})
    } else {
      sendSuccessResponse(res, 200, logicLayer.prepareDetailedAnalyticsData(results))
    }
  })
}
exports.fetchMessageLogs = function (req, res) {
  let {fetchCriteria, countCriteria} = logicLayer.getMessageLogsCriterias(req.body, req.user.companyId)
  async.parallelLimit([
    function (callback) {
      messageLogsDataLayer.aggregate(countCriteria[0].$match, countCriteria[1].$group)
        .then(result => {
          callback(null, result)
        })
        .catch(err => {
          callback(err)
        })
    },
    function (callback) {
      messageLogsDataLayer.aggregate(fetchCriteria[0].$match, null, null, null,
        fetchCriteria[3].$limit, fetchCriteria[1].$sort, fetchCriteria[2].$skip)
        .then(result => {
          callback(null, result)
        })
        .catch(err => {
          callback(err)
        })
    }
  ], 10, function (err, results) {
    if (err) {
      const message = err || 'Error in fetching message logs'
      logger.serverLog(message, `${TAG}: exports.fetchMessageLogs`, req.body, {user: req.user}, 'error')
      return res.status(500).json({status: 'failed', payload: err})
    } else {
      let count = results[0]
      let messageLogs = results[1]
      sendSuccessResponse(res, 200, {count: count.length > 0 ? count[0].count : 0, messageLogs})
    }
  })
}
exports.storeOptinNumberFromWidget = async (req, res) => {
  try {
    const contact = await getContact(req.body.companyId, req.body.contactNumber,
      {first_name: req.body.name ? req.body.name : req.body.contactNumber, accepts_marketing: true})
    sendSuccessResponse(res, 200, contact)
  } catch (err) {
    const message = err || 'Internal server error'
    logger.serverLog(message, `${TAG}: exports.storeOptinNumberFromWidget`, req.body, {user: req.user}, 'error')
    sendErrorResponse(res, 500, null, 'Failed to store optin number from widget')
  }
}

exports.fetchWidgetInfo = async (req, res) => {
  try {
    const shopifyIntegrations = await shopifyDataLayer.findShopifyIntegrations({
      companyId: req.body.companyId, _id: req.body.shopifyId
    })

    if (shopifyIntegrations.length < 1) {
      sendErrorResponse(res, 500, null, 'It seems your shopify store is not connected to KiboPush properly. Please contact KiboPush Support.')
    } else {
      const superNumberPreferences = await dataLayer.findOne({companyId: req.body.companyId})
      sendSuccessResponse(res, 200, superNumberPreferences)
    }
  } catch (err) {
    const message = err || 'Internal server error'
    logger.serverLog(message, `${TAG}: exports.storeOptinNumberFromWidget`, req.body, {user: req.user}, 'error')
    sendErrorResponse(res, 500, null, 'Failed to store optin number from widget')
  }
}
exports.fetchCODAnalytics = function (req, res) {
  async.parallelLimit([
    function (callback) {
      let {matchQuery, groupQuery} = logicLayer.CODAnalyticsQuery(req.body, req.user.companyId, 'COD_ORDER_CONFIRMATION')
      messageLogsDataLayer.aggregate(matchQuery, groupQuery)
        .then(result => {
          callback(null, result)
        })
        .catch(err => {
          callback(err)
        })
    },
    function (callback) {
      let {matchQuery, groupQuery} = logicLayer.CODAnalyticsQuery(req.body, req.user.companyId, 'COD_ORDER_CONFIRMATION', 'confirmed')
      messageLogsDataLayer.aggregate(matchQuery, groupQuery)
        .then(result => {
          callback(null, result)
        })
        .catch(err => {
          callback(err)
        })
    },
    function (callback) {
      let {matchQuery, groupQuery} = logicLayer.CODAnalyticsQuery(req.body, req.user.companyId, 'COD_ORDER_CONFIRMATION', 'no-response')
      messageLogsDataLayer.aggregate(matchQuery, groupQuery)
        .then(result => {
          callback(null, result)
        })
        .catch(err => {
          callback(err)
        })
    },
    function (callback) {
      let {matchQuery, groupQuery} = logicLayer.CODAnalyticsQuery(req.body, req.user.companyId, 'COD_ORDER_CONFIRMATION', 'cancelled')
      messageLogsDataLayer.aggregate(matchQuery, groupQuery)
        .then(result => {
          callback(null, result)
        })
        .catch(err => {
          callback(err)
        })
    }
  ], 10, function (err, results) {
    if (err) {
      const message = err || 'Error in fetching cod analytics'
      logger.serverLog(message, `${TAG}: exports.fetchCODAnalytics`, req.body, {user: req.user}, 'error')
      return res.status(500).json({status: 'failed', payload: err})
    } else {
      let payload = {
        ordersPlaced: results[0].length > 0 ? results[0][0].count : 0,
        confirmed: results[1].length > 0 ? results[1][0].count : 0,
        noResponse: results[2].length > 0 ? results[2][0].count : 0,
        cancelled: results[3].length > 0 ? results[3][0].count : 0,
        messagesSent: results[0].length > 0 ? results[0][0].count : 0
      }
      sendSuccessResponse(res, 200, payload)
    }
  })
}
exports.fetchAbandonedCartAnalytics = async function (req, res) {
  const shopifyIntegration = await shopifyDataLayer.findOneShopifyIntegration({ companyId: req.user.companyId })
  if (shopifyIntegration) {
    const shopify = new EcommerceProviders(commerceConstants.shopify, {
      shopUrl: shopifyIntegration.shopUrl,
      shopToken: shopifyIntegration.shopToken
    })
    const storeInfo = await shopify.fetchStoreInfo()
    async.parallelLimit([
      function (callback) {
        let {matchQuery, groupQuery} = logicLayer.CODAnalyticsQuery(req.body, req.user.companyId, 'ABANDONED_CART_RECOVERY')
        messageLogsDataLayer.aggregate(matchQuery, groupQuery)
          .then(result => {
            callback(null, result)
          })
          .catch(err => {
            callback(err)
          })
      },
      function (callback) {
        let {matchQuery, groupQuery} = logicLayer.CODAnalyticsQuery(req.body, req.user.companyId, 'ABANDONED_CART_RECOVERY', 'recovered')
        messageLogsDataLayer.aggregate(matchQuery, groupQuery)
          .then(result => {
            callback(null, result)
          })
          .catch(err => {
            callback(err)
          })
      }
    ], 10, function (err, results) {
      if (err) {
        const message = err || 'Error in fetching abandoned cart analytics'
        logger.serverLog(message, `${TAG}: exports.fetchAbandonedCartAnalytics`, req.body, {user: req.user}, 'error')
        return res.status(500).json({status: 'failed', payload: err})
      } else {
        let payload = {
          cartsRecovered: results[1].length > 0 ? results[1][0].count : 0,
          currency: storeInfo.currency,
          orderValueRecovered: results[1].length > 0 ? results[1][0].amount : 0,
          recoveryRate: results[1].length > 0 ? ((results[1][0].count / results[0][0].count) * 100).toFixed(2) : 0
        }
        sendSuccessResponse(res, 200, payload)
      }
    })
  } else {
    sendErrorResponse(res, 500, null, 'No Shopify Integration found')
  }
}
exports.fetchWidgetAnalytics = function (req, res) {
  async.parallelLimit([
    function (callback) {
      let {matchQuery, groupQuery} = logicLayer.widgetAnalyticsQuery(req.body, req.user.companyId, 'date')
      widgetAnalyticsDataLayer.aggregate(matchQuery, groupQuery)
        .then(result => {
          callback(null, result)
        })
        .catch(err => {
          callback(err)
        })
    },
    function (callback) {
      let {matchQuery, groupQuery} = logicLayer.widgetAnalyticsQuery(req.body, req.user.companyId, 'page')
      widgetAnalyticsDataLayer.aggregate(matchQuery, groupQuery)
        .then(result => {
          callback(null, result)
        })
        .catch(err => {
          callback(err)
        })
    }
  ], 10, function (err, results) {
    if (err) {
      const message = err || 'Error in fetching widget analytics'
      logger.serverLog(message, `${TAG}: exports.fetchWidgetAnalytics`, req.body, {user: req.user}, 'error')
      return res.status(500).json({status: 'failed', payload: err})
    } else {
      let graphDatas = results[0]
      let clicksCount = 0
      if (graphDatas.length > 0) {
        clicksCount = graphDatas.reduce(function (a, b) {
          return a + b['count']
        }, 0)
      }
      let payload = {
        graphDatas,
        clicksCount,
        pageData: results[1]
      }
      sendSuccessResponse(res, 200, payload)
    }
  })
}
exports.storeWidgetButtonClick = async function (req, res) {
  try {
    let matchQuery = {
      year: new Date().getFullYear(),
      month: new Date().getMonth() + 1,
      day: new Date().getDate(),
      companyId: req.body.companyId,
      widgetType: req.body.widgetType,
      pageUrl: req.body.pageUrl
    }
    let project = {
      'year': {'$year': '$datetime'},
      'month': {'$month': '$datetime'},
      'day': {'$dayOfMonth': '$datetime'},
      companyId: 1,
      widgetType: 1,
      pageUrl: 1,
      _id: 1
    }
    const analytics = await widgetAnalyticsDataLayer.aggregate(matchQuery, null, project)
    if (analytics.length > 0) {
      await widgetAnalyticsDataLayer.update('updateOne', {_id: analytics[0]._id}, { $inc: { 'clickCounts': 1 } })
    } else {
      await widgetAnalyticsDataLayer.create({
        companyId: req.body.companyId,
        widgetType: req.body.widgetType,
        pageUrl: req.body.pageUrl,
        clickCounts: 1
      })
    }
    sendSuccessResponse(res, 200, 'Saved successfully')
  } catch (err) {
    const message = err || 'Internal server error'
    logger.serverLog(message, `${TAG}: exports.storeWidgetButtonClick`, req.body, {user: req.user}, 'error')
    sendErrorResponse(res, 500, null, 'Failed to storeWidgetButtonClick')
  }
}

const logicLayer = require('./subscribers.logiclayer')
const utility = require('../utility')
const dataLayer = require('./subscribers.datalayer')
const logger = require('../../../components/logger')
const TAG = 'api/v2/subscribers/subscribers.controller.js'
const util = require('util')

exports.index = function (req, res) {
  utility.callApi(`companyUser/query`, 'post', {domain_email: req.user.domain_email}, req.headers.authorization) // fetch company user
  .then(companyuser => {
    utility.callApi(`subscribers/query`, 'post', {companyId: companyuser.companyId, isEnabledByPage: true, isSubscribed: true}, req.headers.authorization) // fetch subscribers of company
    .then(subscribers => {
      let subscriberIds = logicLayer.getSubscriberIds(subscribers)
      dataLayer.findTaggedSubscribers({subscriberId: {$in: subscriberIds}})
      .then(tags => {
        let subscribersPayload = logicLayer.getSusbscribersPayload(subscribers, tags)
        return res.status(200).json({
          status: 'success',
          payload: subscribersPayload
        })
      })
      .catch(error => {
        return res.status(500).json({
          status: 'failed',
          payload: `Failed to fetch tags subscribers ${JSON.stringify(error)}`
        })
      })
    })
    .catch(error => {
      return res.status(500).json({
        status: 'failed',
        payload: `Failed to fetch subscribers ${JSON.stringify(error)}`
      })
    })
  })
  .catch(error => {
    return res.status(500).json({
      status: 'failed',
      payload: `Failed to fetch company user ${JSON.stringify(error)}`
    })
  })
}

exports.allSubscribers = function (req, res) {
  utility.callApi(`companyUser/query`, 'post', {domain_email: req.user.domain_email}, req.headers.authorization) // fetch company user
  .then(companyuser => {
    utility.callApi(`subscribers/query`, 'post', {companyId: companyuser.companyId, isEnabledByPage: true}, req.headers.authorization) // fetch subscribers of company
    .then(subscribers => {
      let subscriberIds = logicLayer.getSubscriberIds(subscribers)
      dataLayer.findTaggedSubscribers({subscriberId: {$in: subscriberIds}})
      .then(tags => {
        let subscribersPayload = logicLayer.getSusbscribersPayload(subscribers, tags)
        return res.status(200).json({
          status: 'success',
          payload: subscribersPayload
        })
      })
      .catch(error => {
        return res.status(500).json({
          status: 'failed',
          payload: `Failed to fetch tags subscribers ${JSON.stringify(error)}`
        })
      })
    })
    .catch(error => {
      return res.status(500).json({
        status: 'failed',
        payload: `Failed to fetch subscribers ${JSON.stringify(error)}`
      })
    })
  })
  .catch(error => {
    return res.status(500).json({
      status: 'failed',
      payload: `Failed to fetch company user ${JSON.stringify(error)}`
    })
  })
}

exports.allLocales = function (req, res) {
  utility.callApi(`companyUser/query`, 'post', {domain_email: req.user.domain_email}, req.headers.authorization) // fetch company user
  .then(companyuser => {
    let aggregateObject = [{$group: {_id: null, locales: {$addToSet: '$locale'}}}]
    utility.callApi(`subscribers/aggregate`, 'post', aggregateObject, req.headers.authorization) // fetch subscribers locales
    .then(locales => {
      return res.status(200).json({
        status: 'success',
        payload: locales[0].locales
      })
    })
    .catch(error => {
      return res.status(500).json({
        status: 'failed',
        payload: `Failed to fetch locales ${JSON.stringify(error)}`
      })
    })
  })
  .catch(error => {
    return res.status(500).json({
      status: 'failed',
      payload: `Failed to fetch company user ${JSON.stringify(error)}`
    })
  })
}

exports.getAll = function (req, res) {
  utility.callApi(`companyUser/query`, 'post', {domain_email: req.user.domain_email}, req.headers.authorization) // fetch company user
  .then(companyuser => {
    let criterias = logicLayer.getCriterias(req.body, companyuser)
    utility.callApi(`subscribers/aggregate`, 'post', criterias.countCriteria, req.headers.authorization) // fetch subscribers count
    .then(count => {
      utility.callApi(`subscribers/aggregate`, 'post', criterias.fetchCriteria, req.headers.authorization) // fetch subscribers
      .then(subscribers => {
        let subscriberIds = logicLayer.getSubscriberIds(subscribers)
        logger.serverLog(TAG, `subscriberIds: ${util.inspect(subscriberIds)}`)
        dataLayer.findTaggedSubscribers({subscriberId: {$in: subscriberIds}})
        .then(tags => {
          logger.serverLog(TAG, `tags: ${util.inspect(tags)}`)
          let subscribersPayload = logicLayer.getSusbscribersPayload(subscribers, tags)
          logger.serverLog(TAG, `subscribersPayload: ${util.inspect(subscribersPayload)}`)
          return res.status(200).json({
            status: 'success',
            payload: {subscribers: subscribersPayload, count: count.length > 0 ? count[0].count : 0}
          })
        })
        .catch(error => {
          return res.status(500).json({
            status: 'failed',
            payload: `Failed to fetch tags subscribers ${JSON.stringify(error)}`
          })
        })
      })
      .catch(error => {
        return res.status(500).json({
          status: 'failed',
          payload: `Failed to fetch subscribers ${JSON.stringify(error)}`
        })
      })
    })
    .catch(error => {
      return res.status(500).json({
        status: 'failed',
        payload: `Failed to fetch subscriber count ${JSON.stringify(error)}`
      })
    })
  })
  .catch(error => {
    return res.status(500).json({
      status: 'failed',
      payload: `Failed to fetch company user ${JSON.stringify(error)}`
    })
  })
}

exports.subscribeBack = function (req, res) {
  utility.callApi(`subscribers/update`, 'put', {query: {_id: req.params.id, unSubscribedBy: 'agent'}, newPayload: {isSubscribed: true, unSubscribedBy: 'subscriber'}, options: {}}, req.headers.authorization) // fetch single subscriber
  .then(subscriber => {
    return res.status(200).json({
      status: 'success',
      payload: subscriber
    })
  })
  .catch(error => {
    return res.status(500).json({
      status: 'failed',
      payload: `Failed to fetch subscriber ${JSON.stringify(error)}`
    })
  })
}

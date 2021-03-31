'use strict'
const compose = require('composable-middleware')
const { callApi } = require('../v1.1/utility')
const async = require('async')
const { facebookApiCaller } = require('./facebookApiCaller')
const config = require('../../config/environment')
const logger = require('../../components/logger')
const TAG = 'api/global/middleware.js'

exports.checkSMPStatus = () => {
  return compose().use((req, res, next) => {
    callApi(`pages/query`, 'post', { companyId: req.user.companyId, connected: true })
      .then(connectedPages => {
        if (!connectedPages || connectedPages.length === 0) {
          return res.status(500)
            .json({
              status: 'failed',
              description: 'Fatal Error. There is no connected page with your app.'
            })
        }
        if (connectedPages.length > 0) {
          checkStatusForEachPage(connectedPages, next, req, res)
        }
      })
      .catch(err => {
        const message = err || 'unable fetch pages'
        logger.serverLog(message, `${TAG}: exports.checkSMPStatus`, {}, {user: req.user}, 'error')
        return res.status(500)
          .json({ status: 'failed', description: `Internal Server Error: ${err}` })
      })
  })
}

function checkStatusForEachPage (pages, next, req, res) {
  let statusArray = []
  async.each(pages, function (page, cb) {
    if (config.ignoreSMP && config.ignoreSMP.includes(page.pageId)) {
      statusArray.push({ pageId: page._id, smpStatus: 'approved' })
      cb()
    } else {
      isApprovedForSMP(page)
        .then(smpStatus => {
          statusArray.push({ pageId: page._id, smpStatus: smpStatus })
          cb()
        })
        .catch(err => {
          cb(err)
        })
    }
  }, function (err) {
    if (err) {
      const message = err || 'error in async each'
      logger.serverLog(message, `${TAG}: exports.checkStatusForEachPage`, {}, {pages, user: req.user}, 'error')
      return res.status(500)
        .json({ status: 'failed', description: `Internal Server Error: ${err}` })
    } else {
      req.user.SMPStatus = statusArray
      next()
    }
  })
}

function isApprovedForSMP (page) {
  return new Promise((resolve, reject) => {
    if (page.tasks && page.tasks.includes('MANAGE')) {
      facebookApiCaller(
        'v5.0',
        `me/messaging_feature_review?access_token=${page.accessToken}`,
        'GET'
      )
        .then(response => {
          if (response.body.error) {
            // handling "This action was not submitted due to new privacy rules in Europe." error
            if (response.body.error.code === 10 && response.body.error.error_subcode === 2018336) {
              resolve('rejected')
            } else {
              reject(response.body.error)
            }
          } else {
            let data = response.body.data
            let smp = data.filter((d) => d.feature === 'subscription_messaging')
            if (smp.length > 0 && smp[0].status.toLowerCase() === 'approved') {
              resolve('approved')
            } else if (smp.length > 0 && smp[0].status.toLowerCase() === 'rejected') {
              resolve('rejected')
            } else if (smp.length > 0 && smp[0].status.toLowerCase() === 'pending') {
              resolve('pending')
            } else {
              resolve('notApplied')
            }
          }
        })
        .catch(err => {
          const message = err || 'error in fb call'
          logger.serverLog(message, `${TAG}: exports.isApprovedForSMP`, {}, {page}, 'error')
          reject(err)
        })
    } else {
      resolve('approved') // workaround for page editors
    }
  })
}

exports.attachBuyerInfo = () => {
  return compose().use((req, res, next) => {
    callApi(`companyUser/query`, 'post', { companyId: req.user.companyId, role: 'buyer' })
      .then(buyerInfo => {
        if (!buyerInfo) {
          return res.status(404).json({
            status: 'failed',
            description: 'The buyer account has some technical problems. Please contact support'
          })
        }
        return callApi(`user/query`, 'post', {domain_email: buyerInfo.domain_email})
      })
      .then(buyerInfo => {
        buyerInfo = buyerInfo[0]
        if (!buyerInfo) {
          return res.status(404).json({
            status: 'failed',
            description: 'The buyer account has some technical problems. Please contact support'
          })
        }
        req.user.buyerInfo = buyerInfo
        next()
      })
      .catch(error => {
        const message = error || 'Failed to fetch buyer account'
        logger.serverLog(message, `${TAG}: attachBuyerInfo`, req.body, {user: req.user}, 'error')
        return res.status(500).json({
          status: 'failed',
          payload: `Failed to fetch buyer account ${JSON.stringify(error)}`
        })
      })
  })
}

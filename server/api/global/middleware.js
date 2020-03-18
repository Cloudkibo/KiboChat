'use strict'
const compose = require('composable-middleware')
const { callApi } = require('../v1.1/utility')
const async = require('async')
const { facebookApiCaller } = require('./facebookApiCaller')
const config = require('../../config/environment')

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
    facebookApiCaller(
      'v5.0',
      `me/messaging_feature_review?access_token=${page.accessToken}`,
      'GET'
    )
      .then(response => {
        if (response.body.error) {
          reject(response.body.error)
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
        reject(err)
      })
  })
}

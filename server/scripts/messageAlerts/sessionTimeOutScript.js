const utility = require('../../api/v1.1/utility')
const logger = require('../../components/logger')
const TAG = 'scripts/NotificationScript.js'
const async = require('async')
const moment = require('moment')

exports.runSessionTimeOutScript = function () {
  let query = {
    purpose: 'findAll',
    match: {$or: [{alertChannel: 'messenger'}, {alertChannel: 'whatsApp'}]}
  }
  utility.callApi(`alerts/subscriptions/query`, 'post', query, 'kibochat')
    .then(subscriptions => {
      if (subscriptions.length > 0) {
        async.each(subscriptions, function (subscription, cb) {
          _isSessionTimedOut(subscription)
            .then(isSessionTimedOut => {
              if (isSessionTimedOut) {
              }
              cb()
            })
            .catch((err) => {
              cb(err)
            })
        }, function (err, result) {
          if (err) {
            const message = err || 'Unable to send alerts'
            logger.serverLog(message, `${TAG}: runSessionTimeOutScript`, {}, {query}, 'error')
          } else {
            console.log('script ran successfully')
          }
        })
      }
    })
    .catch((err) => {
      const message = err || 'Unable to fetch alert subscriptions'
      logger.serverLog(message, `${TAG}: exports.runSessionTimeOutScript`, {}, {}, 'error')
    })
}

function _isSessionTimedOut (subscription) {
  return new Promise((resolve, reject) => {
    if (subscription.platform === 'messenger') {
      let query = {
        purpose: 'aggregate',
        match: {sender_fb_id: subscription.channelId, format: 'facebook', company_id: subscription.companyId},
        sort: {_id: -1},
        limit: 1
      }
      utility.callApi(`livechat/query`, 'post', query, 'kibochat')
        .then(lastMessage => {
          if (lastMessage.length > 0) {
            lastMessage = lastMessage[0]
            console.log('messenger', moment(lastMessage.datetime).fromNow())
            let isSessionTimedOut = moment(lastMessage.datetime).isAfter(moment().subtract(23, 'hours'))
            console.log('isSessionTimedOut', isSessionTimedOut)
            resolve(isSessionTimedOut ? lastMessage : false)
          } else {
            resolve(false)
          }
        })
        .catch((err) => {
          reject(err)
        })
    } else {
      let query = {
        purpose: 'aggregate',
        match: {senderNumber: subscription.channelId, format: 'whatsApp', companyId: subscription.companyId},
        sort: {_id: -1},
        limit: 1
      }
      utility.callApi(`whatsAppChat/query`, 'post', query, 'kibochat')
        .then(lastMessage => {
          if (lastMessage.length > 0) {
            lastMessage = lastMessage[0]
            console.log('whatsApp', moment(lastMessage.datetime).fromNow())
            let isSessionTimedOut = moment(lastMessage.datetime).isAfter(moment().subtract(2, 'hours'))
            console.log('isSessionTimedOut', isSessionTimedOut)
            resolve(isSessionTimedOut ? lastMessage : false)
          } else {
            resolve(false)
          }
        })
        .catch((err) => {
          reject(err)
        })
    }
  })
}

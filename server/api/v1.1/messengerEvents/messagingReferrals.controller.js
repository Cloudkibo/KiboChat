const logicLayer = require('./logiclayer')
const {callApi} = require('../utility')
const logger = require('../../../components/logger')
const TAG = 'api/v1/messengerEvents/messagingreferrals.controller.js'
const request = require('request')

exports.index = function (req, res) {
  res.status(200).json({
    status: 'success',
    description: `received the payload`
  })
  const sender = req.body.senderId
  const pageId = req.body.pageId
  callApi(`pages/query`, 'post', { pageId: pageId, connected: true })
    .then(page => {
      page = page[0]
      callApi(`subscribers/query`, 'post', { pageId: page._id, companyId: page.companyId, senderId: sender, completeInfo: true })
        .then(subscriber => {
          subscriber = subscriber[0]
          callApi(`pageReferrals/query`, 'post', { pageId: page._id, companyId: page.companyId, ref_parameter: req.body.referral.ref })
            .then(pageReferral => {
              pageReferral = pageReferral[0]
              for (let i = 0; i < pageReferral.reply.length; i++) {
                let messageData = logicLayer.prepareSendAPIPayload(subscriber.senderId, pageReferral.reply[i], subscriber.firstName, subscriber.lastName, true)
                request(
                  {
                    'method': 'POST',
                    'json': true,
                    'formData': messageData,
                    'uri': 'https://graph.facebook.com/v6.0/me/messages?access_token=' +
                      subscriber.pageId.accessToken
                  },
                  (err, res) => {
                    if (err) {
                      return logger.serverLog(TAG,
                        `At send message pageReferralt ${JSON.stringify(err)}`, 'error')
                    } else {
                      if (res.statusCode !== 200) {
                        const message = req.body.error || 'At send message page referral'
                        return logger.serverLog(message, `${TAG}: exports.index`, req.body, {}, 'error')
                      }
                    }
                  })
              }
            })
            .catch(err => {
              const message = err || 'Failed to fetch page referral'
              return logger.serverLog(message, `${TAG}: exports.index`, req.body, {}, 'error')
            })
        })
        .catch(err => {
          const message = err || 'Failed to fetch subscriber'
          return logger.serverLog(message, `${TAG}: exports.index`, req.body, {}, 'error')
        })
    })
    .catch(err => {
      const message = err || 'Failed to fetch page'
      return logger.serverLog(message, `${TAG}: exports.index`, req.body, {}, 'error')
    })
}

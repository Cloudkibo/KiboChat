const logicLayer = require('./logiclayer')
const {callApi} = require('../utility')
const logger = require('../../../components/logger')
const TAG = 'api/v1/messengerEvents/messagingreferrals.controller.js'
const request = require('request')

exports.index = function (req, res) {
  console.log('req.body in messagingreferrals', req.body)
  res.status(200).json({
    status: 'success',
    description: `received the payload`
  })
  const sender = req.body.senderId
  const pageId = req.body.pageId
  callApi(`pages/query`, 'post', { pageId: pageId, connected: true })
    .then(page => {
      page = page[0]
      console.log('page Found', page)
      callApi(`subscribers/query`, 'post', { pageId: page._id, senderId: sender })
        .then(subscriber => {
          subscriber = subscriber[0]
          console.log('page._id', page._id)
          callApi(`pageReferrals/query`, 'post', { pageId: page._id, ref_parameter: req.body.referral.ref })
            .then(pageReferral => {
              pageReferral = pageReferral[0]
              console.log('page referral', pageReferral)
              for (let i = 0; i < pageReferral.reply.length; i++) {
                let messageData = logicLayer.prepareSendAPIPayload(subscriber.senderId, pageReferral.reply[i], subscriber.firstName, subscriber.lastName, true)
                console.log('messageData', messageData)
                request(
                  {
                    'method': 'POST',
                    'json': true,
                    'formData': messageData,
                    'uri': 'https://graph.facebook.com/v2.6/me/messages?access_token=' +
                      subscriber.pageId.accessToken
                  },
                  (err, res) => {
                    if (err) {
                      console.log(`At send message pageReferralt ${JSON.stringify(err)}`)
                      return logger.serverLog(TAG,
                        `At send message pageReferralt ${JSON.stringify(err)}`)
                    } else {
                      console.log('res', res.body)
                      if (res.statusCode !== 200) {
                        logger.serverLog(TAG,
                          `At send message page referral ${JSON.stringify(
                            res.body.error)}`)
                      }
                    }
                  })
              }
            })
            .catch(err => {
              logger.serverLog(TAG, `Failed to fetch page referral ${JSON.stringify(err)}`)
            })
        })
        .catch(err => {
          logger.serverLog(TAG, `Failed to fetch subscriber ${JSON.stringify(err)}`)
        })
    })
    .catch(err => {
      logger.serverLog(TAG, `Failed to fetch page ${JSON.stringify(err)}`)
    })
}

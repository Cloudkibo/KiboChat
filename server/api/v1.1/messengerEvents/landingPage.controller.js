const logicLayer = require('./logiclayer')
const {callApi} = require('../utility')
const logger = require('../../../components/logger')
const TAG = 'api/v1/messengerEvents/landingPage.controller.js'
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
          callApi(`landingPage/query`, 'post', { pageId: page._id })
            .then(landingPage => {
              landingPage = landingPage[0]
              if (landingPage.isActive) {
                for (let i = 0; i < landingPage.optInMessage.length; i++) {
                  let messageData = logicLayer.prepareSendAPIPayload(subscriber.senderId, landingPage.optInMessage[i], subscriber.firstName, subscriber.lastName, true, 'SENT_FROM_LANDING_PAGE')
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
                      } else {
                        if (res.statusCode !== 200) {
                          logger.serverLog(TAG,
                            `At send message landingPage ${JSON.stringify(
                              res.body.error)}`, 'error')
                        }
                      }
                    })
                }
              }
            })
            .catch(err => {
              logger.serverLog(TAG, `Failed to fetch landingPage ${JSON.stringify(err)}`, 'error')
            })
        })
        .catch(err => {
          logger.serverLog(TAG, `Failed to fetch subscriber ${JSON.stringify(err)}`, 'error')
        })
    })
    .catch(err => {
      logger.serverLog(TAG, `Failed to fetch page ${JSON.stringify(err)}`, 'error')
    })
}

const utility = require('../../api/v1.1/utility')
const logger = require('../../components/logger')
const TAG = 'scripts/NotificationScript.js'
const async = require('async')
const moment = require('moment')
const { ActionTypes } = require('../../whatsAppMapper/constants')
const whatsAppMapper = require('../../whatsAppMapper/whatsAppMapper')
const { storeChat } = require('../../api/v1.1/whatsAppEvents/controller')
const { facebookApiCaller } = require('../../api/global/facebookApiCaller')
const config = require('../../config/environment/index')
const sgMail = require('@sendgrid/mail')
const needle = require('needle')

exports.runLiveChatNotificationScript = function () {
  let query = {
    purpose: 'aggregate',
    match: {type: 'adminAlert'},
    limit: 500
  }
  unresolvedSession(query)
  pendingSession(query)
  talkToAgent(query)
}

function unresolvedSession (findAdminAlerts) {
  let query = JSON.parse(JSON.stringify(findAdminAlerts))
  query.match['payload.type'] = 'unresolved_session'
  utility.callApi(`cronStack/query`, 'post', query, 'kibochat')
    .then(cronStacks => {
      if (cronStacks.length > 0) {
        async.each(cronStacks, function (cronStack, cb) {
          let query = {
            purpose: 'findOne',
            match: {companyId: cronStack.payload.companyId, platform: cronStack.payload.platform, type: 'unresolved_session'}
          }
          utility.callApi(`alerts/query`, 'post', query, 'kibochat')
            .then(messageAlert => {
              if (messageAlert && messageAlert.enabled) {
                let currentTime = moment(new Date())
                let sessionTime = moment(cronStack.datetime)
                let duration = moment.duration(currentTime.diff(sessionTime))
                // if (duration.asHours() > messageAlert.interval) {
                  utility.callApi(`companyProfile/query`, 'post', { _id: messageAlert.companyId })
                    .then(companyProfile => {
                      _sendAlerts(cronStack, messageAlert, companyProfile, cb)
                    })
                    .catch((err) => {
                      cb(err)
                    })
                // } else {
                //   cb()
                // }
              } else {
                _deleteCronStackRecord(cronStack, cb)
              }
            })
            .catch(error => {
              cb(error)
            })
        }, function (err, result) {
          if (err) {
            const message = err || 'Unable to send alerts'
            logger.serverLog(message, `${TAG}: unresolvedSession`, {}, {cronStacks}, 'error')
          } else {
            query.match['_id'] = {$gt: cronStacks[cronStacks.length - 1]._id}
            unresolvedSession(query)
          }
        })
      } else {
      }
    })
    .catch(err => {
      const message = err || 'Unable to fetch cron stack'
      logger.serverLog(message, `${TAG}: exports.unresolvedSession`, {}, {query}, 'error')
    })
}

function pendingSession (findAdminAlerts) {
  let query = JSON.parse(JSON.stringify(findAdminAlerts))
  query.match['payload.type'] = 'pending_session'
  utility.callApi(`cronStack/query`, 'post', query, 'kibochat')
    .then(cronStacks => {
      if (cronStacks.length > 0) {
        async.each(cronStacks, function (cronStack, cb) {
          let query = {
            purpose: 'findOne',
            match: {companyId: cronStack.payload.companyId, platform: cronStack.payload.platform, type: 'pending_session'}
          }
          utility.callApi(`alerts/query`, 'post', query, 'kibochat')
            .then(messageAlert => {
              if (messageAlert && messageAlert.enabled) {
                let currentTime = moment(new Date())
                let sessionTime = moment(cronStack.datetime)
                let duration = moment.duration(currentTime.diff(sessionTime))
                if (duration.asMinutes() > messageAlert.interval) {
                  utility.callApi(`companyProfile/query`, 'post', { _id: messageAlert.companyId })
                    .then(companyProfile => {
                      if (messageAlert.promptCriteria === 'outside_bussiness_hours' && companyProfile.businessHours) {
                        let dt = new Date()
                        let s = companyProfile.businessHours.opening.split(':')
                        let dt1 = new Date(dt.getFullYear(), dt.getMonth(), dt.getDate(),
                          parseInt(s[0]), parseInt(s[1]), 0)
                        let e = companyProfile.businessHours.closing.split(':')
                        let dt2 = new Date(dt.getFullYear(), dt.getMonth(),
                          dt.getDate(), parseInt(e[0]), parseInt(e[1]), 0)
                        if (dt >= dt1 && dt <= dt2) {
                          _deleteCronStackRecord(cronStack, cb)
                        } else {
                          _sendAlerts(cronStack, messageAlert, companyProfile, cb)
                        }
                      } else {
                        _sendAlerts(cronStack, messageAlert, companyProfile, cb)
                      }
                    })
                    .catch((err) => {
                      cb(err)
                    })
                } else {
                  cb()
                }
              } else {
                _deleteCronStackRecord(cronStack, cb)
              }
            })
            .catch(error => {
              cb(error)
            })
        }, function (err, result) {
          if (err) {
            const message = err || 'Unable to send alerts'
            logger.serverLog(message, `${TAG}: pendingSession`, {}, {cronStacks}, 'error')
          } else {
            query.match['_id'] = {$gt: cronStacks[cronStacks.length - 1]._id}
            pendingSession(query)
          }
        })
      }
    })
    .catch(err => {
      const message = err || 'Unable to fetch cron stack'
      logger.serverLog(message, `${TAG}: pendingSession`, {}, {query}, 'error')
    })
}

function talkToAgent (findAdminAlerts) {
  let query = JSON.parse(JSON.stringify(findAdminAlerts))
  query.match['payload.type'] = 'talk_to_agent'
  utility.callApi(`cronStack/query`, 'post', query, 'kibochat')
    .then(cronStacks => {
      if (cronStacks.length > 0) {
        async.each(cronStacks, function (cronStack, cb) {
          let query = {
            purpose: 'findOne',
            match: {companyId: cronStack.payload.companyId, platform: cronStack.payload.platform, type: 'pending_session'}
          }
          utility.callApi(`alerts/query`, 'post', query, 'kibochat')
            .then(messageAlert => {
              if (messageAlert && messageAlert.enabled) {
                utility.callApi(`companyProfile/query`, 'post', { _id: messageAlert.companyId })
                  .then(companyProfile => {
                    if (messageAlert.promptCriteria === 'outside_bussiness_hours' && companyProfile.businessHours) {
                      let dt = new Date()
                      let s = companyProfile.businessHours.opening.split(':')
                      let dt1 = new Date(dt.getFullYear(), dt.getMonth(), dt.getDate(),
                        parseInt(s[0]), parseInt(s[1]), 0)
                      let e = companyProfile.businessHours.closing.split(':')
                      let dt2 = new Date(dt.getFullYear(), dt.getMonth(),
                        dt.getDate(), parseInt(e[0]), parseInt(e[1]), 0)
                      if (dt >= dt1 && dt <= dt2) {
                        _deleteCronStackRecord(cronStack, cb)
                      } else {
                        _sendAlerts(cronStack, messageAlert, companyProfile, cb)
                      }
                    } else {
                      _sendAlerts(cronStack, messageAlert, companyProfile, cb)
                    }
                  })
                  .catch((err) => {
                    cb(err)
                  })
              } else {
                _deleteCronStackRecord(cronStack, cb)
              }
            })
            .catch(error => {
              cb(error)
            })
        }, function (err, result) {
          if (err) {
            const message = err || 'Unable to send alerts'
            logger.serverLog(message, `${TAG}: talkToAgent`, {}, {cronStacks}, 'error')
          } else {
            query.match['_id'] = {$gt: cronStacks[cronStacks.length - 1]._id}
            talkToAgent(query)
          }
        })
      }
    })
    .catch(err => {
      const message = err || 'Unable to fetch cron stack'
      logger.serverLog(message, `${TAG}: talkToAgent`, {}, {query}, 'error')
    })
}

function _sendAlerts (cronStack, messageAlert, companyProfile, cb) {
  let query = {
    purpose: 'findAll',
    match: {companyId: cronStack.payload.companyId, platform: cronStack.payload.platform}
  }
  let name = cronStack.payload.subscriber.name
  let notificationMessage = ''
  if (cronStack.payload.type === 'unresolved_session') {
    notificationMessage = `Subscriber ${name} session is unresolved and sitting in an open sessions queue for the last ${messageAlert.interval} hour(s).`
  } else if (cronStack.payload.type === 'pending_session') {
    notificationMessage = `Subscriber ${name} session is in pending state for the last ${messageAlert.interval} minute(s) and they are waiting for an agent to respond to them.`
  } else if (cronStack.payload.type === 'talk_to_agent') {
    notificationMessage = `Subscriber ${name} has selected the "Talk to agent" option from ${cronStack.payload.chatbotName} chatbot and they are waiting for an agent to respond to them.`
  }
  utility.callApi(`alerts/subscriptions/query`, 'post', query, 'kibochat')
    .then(subscriptions => {
      if (subscriptions.length > 0) {
        let notificationSubscriptions = subscriptions.filter(s => s.alertChannel === 'notification')
        let messengerSubscriptions = subscriptions.filter(s => s.alertChannel === 'messenger' && s.pageId === cronStack.payload.page._id)
        let whatsAppSubscriptions = subscriptions.filter(s => s.alertChannel === 'whatsApp')
        let emailSubscriptions = subscriptions.filter(s => s.alertChannel === 'email')
        let data = {
          cronStack,
          messageAlert,
          notificationSubscriptions,
          messengerSubscriptions,
          whatsAppSubscriptions,
          emailSubscriptions,
          notificationMessage,
          companyProfile
        }
        async.parallelLimit([
          _sendInAppNotification.bind(null, data),
          _sendOnWhatsApp.bind(null, data),
          _sendOnMessenger.bind(null, data),
          _sendEmail.bind(null, data)
        ], 10, function (err, results) {
          if (err) {
            cb(err)
          } else {
            _sendWebhook(data)
            _deleteCronStackRecord(cronStack, cb)
          }
        })
      } else {
        _sendWebhook({cronStack, notificationMessage})
        _deleteCronStackRecord(cronStack, cb)
      }
    })
    .catch(error => {
      cb(error)
    })
}

function _sendInAppNotification (data, next) {
  if (data.notificationSubscriptions.length > 0) {
    async.each(data.notificationSubscriptions, function (subscription, callback) {
      let notification = {
        companyId: data.messageAlert.companyId,
        message: data.notificationMessage,
        agentId: subscription.channelId,
        category: {type: 'message_alert', id: data.cronStack.payload.subscriber._id},
        platform: data.messageAlert.platform
      }
      utility.callApi(`notifications`, 'post', notification, 'kibochat')
        .then(savedNotification => {
          utility.callApi(`permissions/query`, 'post', {companyId: data.messageAlert.companyId, userId: subscription.channelId})
            .then(userPermission => {
              if (userPermission.length > 0) {
                userPermission = userPermission[0]
                if (data.cronStack.payload.page) {
                  if (userPermission.muteNotifications && userPermission.muteNotifications.includes(data.cronStack.payload.page._id)) {
                    notification.muteNotification = true
                  } else {
                    notification.muteNotification = false
                  }
                } else {
                  notification.muteNotification = false
                }
              }
              require('../../config/socketio').sendMessageToClient({
                room_id: data.messageAlert.companyId,
                body: {
                  action: 'new_notification',
                  payload: notification
                }
              })
              callback()
            })
            .catch(err => {
              callback(err)
            })
        })
        .catch(err => {
          callback(err)
        })
    }, function (err, result) {
      if (err) {
        const message = err || 'Unable to send notification'
        logger.serverLog(message, `${TAG}: _sendInAppNotification`, {}, {data}, 'error')
      }
      next()
    })
  } else {
    next()
  }
}

function _sendOnMessenger (data, next) {
  if (data.messengerSubscriptions.length > 0) {
    async.each(data.messengerSubscriptions, function (subscription, callback) {
      facebookApiCaller('v6.0', `me/messages?access_token=${data.cronStack.payload.page.accessToken}`, 'post', {
        messaging_type: 'RESPONSE',
        recipient: JSON.stringify({ id: subscription.channelId }),
        message: {
          text: data.notificationMessage,
          'metadata': 'This is a meta data'
        }
      }).then(response => {
        if (response.body && response.body.error) {
          callback(response.body.error)
        } else {
          callback()
        }
      })
        .catch(error => {
          callback(error)
        })
    }, function (err, result) {
      if (err) {
        const message = err || 'Unable to send message to messenger'
        logger.serverLog(message, `${TAG}: _sendOnMessenger`, {}, {data},
          err.error_subcode && err.code && err.error_subcode === 2018278 && err.code === 10 ? 'info' : 'error')
      }
      next()
    })
  } else {
    next()
  }
}

function _sendOnWhatsApp (data, next) {
  if (data.whatsAppSubscriptions.length > 0) {
    async.each(data.whatsAppSubscriptions, function (subscription, callback) {
      let response = {
        whatsApp: {
          accessToken: data.companyProfile.whatsApp.accessToken,
          accountSID: data.companyProfile.whatsApp.accountSID,
          businessNumber: data.companyProfile.whatsApp.businessNumber
        },
        recipientNumber: subscription.channelId,
        payload: { componentType: 'text', text: data.notificationMessage }
      }
      whatsAppMapper.whatsAppMapper(data.companyProfile.whatsApp.provider, ActionTypes.SEND_CHAT_MESSAGE, response)
        .then(sent => {
          utility.callApi(`whatsAppContacts/query`, 'post', { number: subscription.channelId, companyId: data.companyProfile._id })
            .then((contact) => {
              if (contact.length > 0) {
                contact = contact[0]
                storeChat(data.companyProfile.whatsApp.businessNumber, contact.number, contact, response.payload, 'convos')
              }
              callback()
            })
            .catch((err) => {
              callback(err)
            })
        })
        .catch(err => {
          callback(err)
        })
    }, function (err, result) {
      if (err) {
        const message = err || 'Unable to send message to whatsapp'
        logger.serverLog(message, `${TAG}: _sendOnWhatsApp`, {}, {data}, 'error')
      }
      next()
    })
  } else {
    next()
  }
}

function _sendEmail (data, next) {
  if (data.emailSubscriptions.length > 0) {
    async.each(data.emailSubscriptions, function (subscription, callback) {
      sgMail.setApiKey(config.SENDGRID_API_KEY)
      const msg = {
        to: subscription.channelId,
        from: 'support@cloudkibo.com',
        subject: 'KiboPush: Message Alert'
      }
      msg.html = getEmailBody(data.notificationMessage, subscription.userName)
      sgMail.send(msg)
        .then(response => {
          callback()
        })
        .catch(err => {
          callback(err)
        })
    }, function (err, result) {
      if (err) {
        const message = err || 'Unable to send email'
        logger.serverLog(message, `${TAG}: _sendEmail`, {}, {data}, 'error')
      }
      next()
    })
  } else {
    next()
  }
}

function _sendWebhook (data) {
  if (data.cronStack.payload.platform === 'messenger') {
    utility.callApi(`webhooks/query`, 'post', { pageId: data.cronStack.payload.page._id, isEnabled: true })
      .then(webhooks => {
        let webhook = webhooks[0]
        if (webhook && webhook.optIn['NOTIFICATION_ALERTS']) {
          var webhookPayload = {
            type: 'NOTIFICATION_ALERT',
            platform: 'facebook',
            payload: {
              psid: data.cronStack.payload.subscriber.senderId,
              pageId: data.cronStack.payload.page.pageId,
              message: data.notificationMessage,
              timestamp: Date.now()
            }
          }
          needle.post(webhook.webhook_url, webhookPayload, {json: true},
            (error, response) => {
              if (error || response.statusCode !== 200) {
                const message = error || 'Cannot send webhook event'
                logger.serverLog(message, `${TAG}: _sendWebhook`, {}, {data}, error ? 'error' : 'info')
              }
            })
        }
      })
      .catch(error => {
        const message = error || 'Cannot fetch webhook'
        logger.serverLog(message, `${TAG}: _sendWebhook`, {}, {data}, 'error')
      })
  }
}

function _deleteCronStackRecord (alert, cb) {
  var deleteData = {
    purpose: 'deleteMany',
    match: {
      type: 'adminAlert',
      'payload.type': alert.payload.type,
      'payload.subscriber._id': alert.payload.subscriber._id
    }
  }
  utility.callApi(`cronstack`, 'delete', deleteData, 'kibochat')
    .then(updatedRecord => {
      cb()
    })
    .catch(err => {
      cb(err)
    })
}
function getEmailBody (notificationMessage, userName) {
  return `
  <!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Strict//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-strict.dtd">
    <html data-editor-version="2" class="sg-campaigns" xmlns="http://www.w3.org/1999/xhtml">
      <head>
          <meta http-equiv="Content-Type" content="text/html; charset=utf-8"/>
          <meta name="viewport" content="width=device-width, initial-scale=1, minimum-scale=1, maximum-scale=1"/>
          <meta http-equiv="X-UA-Compatible" content="IE=Edge"/>
          <!--[if (gte mso 9)|(IE)]>
          <xml>
            <o:OfficeDocumentSettings>
                <o:AllowPNG/>
                <o:PixelsPerInch>96</o:PixelsPerInch>
            </o:OfficeDocumentSettings>
          </xml>
          <![endif]--><!--[if (gte mso 9)|(IE)]>
          <style type="text/css"> body{width: 600px;margin: 0 auto;}table{border-collapse: collapse;}table, td{mso-table-lspace: 0pt;mso-table-rspace: 0pt;}img{-ms-interpolation-mode: bicubic;}</style>
          <![endif]-->
          <style type="text/css"> body, p, div{font-family: arial; font-size: 14px;}body{color: #000000;}body a{color: #1188E6; text-decoration: none;}p{margin: 0; padding: 0;}table.wrapper{width:100% !important; table-layout: fixed; -webkit-font-smoothing: antialiased; -webkit-text-size-adjust: 100%; -moz-text-size-adjust: 100%; -ms-text-size-adjust: 100%;}img.max-width{max-width: 100% !important;}.column.of-2{width: 50%;}.column.of-3{width: 33.333%;}.column.of-4{width: 25%;}@media screen and (max-width:480px){.preheader .rightColumnContent, .footer .rightColumnContent{text-align: left !important;}.preheader .rightColumnContent div, .preheader .rightColumnContent span, .footer .rightColumnContent div, .footer .rightColumnContent span{text-align: left !important;}.preheader .rightColumnContent, .preheader .leftColumnContent{font-size: 80% !important; padding: 5px 0;}table.wrapper-mobile{width: 100% !important; table-layout: fixed;}img.max-width{height: auto !important; max-width: 480px !important;}a.bulletproof-button{display: block !important; width: auto !important; font-size: 80%; padding-left: 0 !important; padding-right: 0 !important;}.columns{width: 100% !important;}.column{display: block !important; width: 100% !important; padding-left: 0 !important; padding-right: 0 !important; margin-left: 0 !important; margin-right: 0 !important;}}</style>
      </head>
      <body>
          <center class="wrapper" data-link-color="#1188E6" data-body-style="font-size: 14px; font-family: arial; color: #000000; background-color: #ebebeb;">
            <div class="webkit">
                <table cellpadding="0" cellspacing="0" border="0" width="100%" class="wrapper" bgcolor="#ebebeb">
                  <tr>
                      <td valign="top" bgcolor="#ebebeb" width="100%">
                        <table width="100%" role="content-container" class="outer" align="center" cellpadding="0" cellspacing="0" border="0">
                            <tr>
                              <td width="100%">
                                  <table width="100%" cellpadding="0" cellspacing="0" border="0">
                                    <tr>
                                        <td>
                                          <!--[if mso]>
                                          <center>
                                              <table>
                                                <tr>
                                                    <td width="600">
                                                      <![endif]-->
                                                      <table width="100%" cellpadding="0" cellspacing="0" border="0" style="width: 100%; max-width:600px;" align="center">
                                                          <tr>
                                                            <td role="modules-container" style="padding: 0px 0px 0px 0px; color: #000000; text-align: left;" bgcolor="#ffffff" width="100%" align="left">
                                                                <table class="module preheader preheader-hide" role="module" data-type="preheader" border="0" cellpadding="0" cellspacing="0" width="100%" style="display: none !important; mso-hide: all; visibility: hidden; opacity: 0; color: transparent; height: 0; width: 0;">
                                                                  <tr>
                                                                      <td role="module-content">
                                                                        <p></p>
                                                                      </td>
                                                                  </tr>
                                                                </table>
                                                                <table class="wrapper" role="module" data-type="image" border="0" cellpadding="0" cellspacing="0" width="100%" style="table-layout: fixed;">
                                                                  <tr>
                                                                      <td style="font-size:6px;line-height:10px;padding:35px 0px 0px 0px;background-color:#ffffff;" valign="top" align="center"> <img class="max-width" border="0" style="display:block;color:#000000;text-decoration:none;font-family:Helvetica, arial, sans-serif;font-size:16px;" width="300" height="75" src="https://kibopush.com/wp-content/uploads/2020/07/kibopush-logo.png" alt="Logo"> </td>
                                                                  </tr>
                                                                </table>
                                                                <table class="module" role="module" data-type="text" border="0" cellpadding="0" cellspacing="0" width="100%" style="table-layout: fixed;">
                                                                  <tr>
                                                                      <td style="padding:15px 045px 30px 45px;line-height:22px;text-align:inherit;" height="100%" valign="top" bgcolor="">
                                                                        <div>Hello ${userName},</div>
                                                                        <div>&nbsp;</div>
                                                                        <div>${notificationMessage}</div>
                                                                        <div>&nbsp;</div>
                                                                        <div>If you have any queries, you can send message to our <a href="https://www.facebook.com/kibopush/" style="background-color: rgb(255, 255, 255); font-style: normal; font-variant-ligatures: normal; font-variant-caps: normal; font-weight: 400; font-family: arial; font-size: 14px;">Facebook Page</a>. Our admins will get back to you. Or, you can join our <a href="https://www.facebook.com/groups/kibopush/">Facebook Community</a>.</div>
                                                                        <div>&nbsp;</div>
                                                                        <div>Thanks</div>
                                                                        <div>&nbsp;</div>
                                                                        <div>Regards,</div>
                                                                        <div>KiboPush Team</div>
                                                                        <div>CloudKibo</div>
                                                                      </td>
                                                                  </tr>
                                                                </table>
                                                                <table class="module" role="module" data-type="social" align="center" border="0" cellpadding="0" cellspacing="0" width="100%" style="table-layout: fixed;">
                                                                  <tbody>
                                                                      <tr>
                                                                        <td valign="top" style="padding:10px 0px 30px 0px;font-size:6px;line-height:10px;background-color:#f5f5f5;">
                                                                            <table align="center">
                                                                              <tbody>
                                                                                  <tr>
                                                                                    <td style="padding: 0px 5px;"> <a role="social-icon-link" href="https://www.facebook.com/kibopush/" target="_blank" alt="Facebook" data-nolink="false" title="Facebook " style="-webkit-border-radius:3px;-moz-border-radius:3px;border-radius:3px;display:inline-block;background-color:#3B579D;"> <img role="social-icon" alt="Facebook" title="Facebook " height="30" width="30" style="height: 30px, width: 30px" src="https://marketing-image-production.s3.amazonaws.com/social/white/facebook.png"/> </a> </td>
                                                                                    <td style="padding: 0px 5px;"> <a role="social-icon-link" href="https://twitter.com/kibopush" target="_blank" alt="Twitter" data-nolink="false" title="Twitter " style="-webkit-border-radius:3px;-moz-border-radius:3px;border-radius:3px;display:inline-block;background-color:#7AC4F7;"> <img role="social-icon" alt="Twitter" title="Twitter " height="30" width="30" style="height: 30px, width: 30px" src="https://marketing-image-production.s3.amazonaws.com/social/white/twitter.png"/> </a> </td>
                                                                                  </tr>
                                                                              </tbody>
                                                                            </table>
                                                                        </td>
                                                                      </tr>
                                                                  </tbody>
                                                                </table>
                                                            </td>
                                                          </tr>
                                                      </table>
                                                      <!--[if mso]>
                                                    </td>
                                                </tr>
                                              </table>
                                          </center>
                                          <![endif]-->
                                        </td>
                                    </tr>
                                  </table>
                              </td>
                            </tr>
                        </table>
                      </td>
                  </tr>
                </table>
            </div>
          </center>
      </body>
    </html>
  `
}

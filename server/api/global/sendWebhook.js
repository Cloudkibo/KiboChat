const needle = require('needle')
const logger = require('../../components/logger')
const utility = require('../v1.1/utility')
const TAG = 'api/global/sendWebhook.js'
const config = require('../../config/environment/index')
const sgMail = require('@sendgrid/mail')

exports.sendWebhook = (type, platform, payload, page) => {
  utility.callApi(`webhooks/query`, 'post', { pageId: page._id, isEnabled: true })
    .then(webhooks => {
      let webhook = webhooks[0]
      if (webhook && webhook.optIn[type]) {
        needle.get(webhook.webhook_url, (err, r) => {
          if (err) {
            logger.serverLog(TAG, `Cannot connect to url ${err}`)
          } else if (r.statusCode === 200) {
            var data = {
              type,
              platform,
              payload: payload
            }
            needle.post(webhook.webhook_url, data, {json: true},
              (error, response) => {
                if (error) logger.serverLog(TAG, `Cannot send webhook event ${err}`, 'error')
              })
          } else {
            saveNotification(webhook, page, platform)
            sendEmail(webhook, webhook.userId, page)
          }
        })
      }
    })
    .catch(error => {
      logger.serverLog(TAG, `Failed to fetch webhook ${JSON.stringify(error)}`, 'error')
    })
}

function updateWebhook (webhook) {
  utility.callApi(`webhooks/${webhook._id}`, 'put', {isEnabled: false, error_message: 'URL not live'})
    .then(updated => {
    })
    .catch(error => {
      logger.serverLog(TAG, `Failed to update webhook ${JSON.stringify(error)}`, 'error')
    })
}

function saveNotification (webhook, page, platform) {
  let notificationsData = {
    message: `The server at the URL "${webhook.webhook_url}" is not live. Please verify that your server is functioning.`,
    category: {type: 'webhook_failed', id: page._id},
    agentId: webhook.userId._id,
    companyId: webhook.companyId,
    platform: platform
  }
  utility.callApi(`notifications`, 'post', notificationsData, 'kibochat')
    .then(savedNotification => {
    })
    .catch(error => {
      logger.serverLog(TAG, `Failed to create notification ${error}`, 'error')
    })
}

function sendEmail (webhook, user, page) {
  sgMail.setApiKey(config.SENDGRID_API_KEY)
  const msg = {
    to: webhook.userId.email,
    from: 'support@cloudkibo.com',
    subject: 'KiboPush: Webhook failed'
  }
  msg.html = getEmailBody(webhook.webhook_url, user.name, page.pageName)
  sgMail.send(msg)
    .then(response => {
    })
    .catch(err => {
      logger.serverLog(TAG, `Failed to send email ${JSON.stringify(err)}`, 'error')
    })
}

function getEmailBody (webhookUrl, userName, pageName) {
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
                                                                        <div>Hope you are doing well!</div>
                                                                        <div>&nbsp;</div>
                                                                        <div>The server at your given URL ${webhookUrl} for page ${pageName} is not live. Please verify that your callback server is functioning and then enable it from KiboPush Settings in order to receive webhook events.</div>
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

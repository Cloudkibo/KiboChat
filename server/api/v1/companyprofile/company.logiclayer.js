const sgMail = require('@sendgrid/mail')
let config = require('./../../../config/environment')
const logger = require('../../../components/logger')
const TAG = 'api/companyprofile/company.logiclayer.js'

exports.getPlatformForSms = function (company, user) {
  if (user.connectFacebook) {
    return 'messenger'
  } else if (company.whatsApp && !(company.whatsApp.connected === false)) {
    return 'whatsApp'
  } else {
    return ''
  }
}
exports.getPlatformForWhatsApp = function (company, user) {
  if (user.connectFacebook) {
    return 'messenger'
  } else if (company.sms) {
    return 'sms'
  } else {
    return ''
  }
}
exports.sendInHouseEmail = function (user, body) {
  sgMail.setApiKey(config.SENDGRID_API_KEY)
  const msg = {
    to: ['sojharo@cloudkibo.com', 'jawaid@cloudkibo.com', 'imran@cloudkibo.com'],
    from: 'support@cloudkibo.com',
    subject: 'KiboPush: Enterprise plan selected'
  }
  msg.html = (
    '<body style="min-width: 80%;-webkit-text-size-adjust: 100%;-ms-text-size-adjust: 100%;margin: 0;padding: 0;direction: ltr;background: #f6f8f1;width: 80% !important;"><table class="body", style="width:100%"> ' +
    '<tr> <td class="center" align="center" valign="top"> <!-- BEGIN: Header --> <table class="page-header" align="center" style="width: 100%;background: #1f1f1f;"> <tr> <td class="center" align="center"> ' +
    '<!-- BEGIN: Header Container --> <table class="container" align="center"> <tr> <td> <table class="row "> <tr>  </tr> </table> <!-- END: Logo --> </td> <td class="wrapper vertical-middle last" style="padding-top: 0;padding-bottom: 0;vertical-align: middle;"> <!-- BEGIN: Social Icons --> <table class="six columns"> ' +
    '<tr> <td> <table class="wrapper social-icons" align="right" style="float: right;"> <tr> <td class="vertical-middle" style="padding-top: 0;padding-bottom: 0;vertical-align: middle;padding: 0 2px !important;width: auto !important;"> ' +
    '<p style="color: #ffffff"> Enterprise plan selected </p> </td></tr> </table> </td> </tr> </table> ' +
    '<!-- END: Social Icons --> </td> </tr> </table> </td> </tr> </table> ' +
    '<!-- END: Header Container --> </td> </tr> </table> <!-- END: Header --> <!-- BEGIN: Content --> <table class="container content" align="center"> <tr> <td> <table class="row note"> ' +
    '<tr> <td class="wrapper last"> <p> Hello, <br><br> This is to inform you that the following individual is interested in using our SMS service under Enterprise Plan. The details are as follows:</p> <p> <ul>' +
    '<li>Name: ' + user.name + '</li><li>Email: ' + user.email + '</li><li>Platform: ' + 'SMS' + '</li><li>Provider: ' + body.provider + '</li><li>Business Number: ' + body.businessNumber + '</li><li>Messages requested: ' + body.messages +
    ' </li> </ul> </p>  <!-- BEGIN: Note Panel --> <table class="twelve columns" style="margin-bottom: 10px"> ' +
    '</table><!-- END: Note Panel --> </td> </tr> </table><span class="devider" style="border-bottom: 1px solid #eee;margin: 15px -15px;display: block;"></span> <!-- END: Disscount Content --> </td> </tr> </table> </td> </tr> </table> <!-- END: Content --> <!-- BEGIN: Footer --> <table class="page-footer" align="center" style="width: 100%;background: #2f2f2f;"> <tr> <td class="center" align="center" style="vertical-align: middle;color: #fff;"> <table class="container" align="center"> <tr> <td style="vertical-align: middle;color: #fff;"> <!-- BEGIN: Unsubscribet --> <table class="row"> <tr> <td class="wrapper last" style="vertical-align: middle;color: #fff;"><span style="font-size:12px;"><i>This is a system generated email and reply is not required.</i></span> </td> </tr> </table> <!-- END: Unsubscribe --> ' +
    '<!-- END: Footer Panel List --> </td> </tr> </table> </td> </tr> </table> <!-- END: Footer --> </td> </tr></table></body>')
  sgMail.send(msg)
    .then(response => {
    })
    .catch(err => {
      const message = err || 'Failed to send email'
      logger.serverLog(message, `${TAG}: exports.sendInHouseEmail`, {}, {}, 'error')
    })
}

exports.prepareSmsConfigurationPayload = function (body, company) {
  let data = {}
  data.purchasedPlans = company.purchasedPlans || {}
  data.purchasedPlans[body.platform] = body.planId
  data.planId = body.planId
  if (body.numberDetails) {
    data.sms = {
      provider: 'bandwidth',
      accountStatus: 'pending',
      accountType: 'cloudkibo',
      businessNumber: body.number
    }
  }
  return data
}

exports.prepareCompanyUsagePayload = function (company, body) {
  let data = {
    companyId: company._id,
    platform: body.platform,
    broadcasts: 0,
    sessions: 0,
    chat_messages: 0,
    subscribers: 0,
    messages: 0
  }
  return data
}

exports.prepareCompanyUsagePayloadForFb = function (company, body) {
  let data = {
    companyId: company._id,
    platform: body.platform,
    broadcasts: 0,
    surveys: 0,
    polls: 0,
    broadcast_templates: 0,
    survey_templates: 0,
    polls_templates: 0,
    chat_messages: 0,
    facebook_pages: 0,
    bots: 0,
    subscribers: 0,
    phone_invitation: 0,
    facebook_autoposting: 0,
    twitter_autoposting: 0,
    wordpress_autoposting: 0,
    broadcast_sequences: 0,
    messages_per_sequence: 0,
    messages: 0,
    segmentation_lists: 0,
    custom_fields: 0,
    tags: 0,
    tags_per_subscriber: 0,
    template_categories: 0,
    rss_feeds: 0,
    news_integration_feeds: 0,
    broadcast_levels: 0,
    comment_capture_rules: 0,
    messenger_codes: 0,
    landing_pages: 0,
    json_ads: 0,
    messenger_ref_urls: 0,
    overlay_widgets: 0,
    members: 0,
    teams: 0,
    external_integrations: 0,
    intents_per_bot: 0,
    sponsored_broadcasts: 0,
    chatbot_automation: 0,
    chatbot_automation_levels: 0
  }
  return data
}

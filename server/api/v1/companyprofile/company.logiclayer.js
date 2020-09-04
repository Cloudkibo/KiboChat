exports.getPlatformForSms = function (company, user) {
  if (user.connectFacebook) {
    return 'messenger'
  } else if (company.whatsApp) {
    return 'whatsApp'
  } else {
    return ''
  }
}
exports.getPlatformForWhatsApp = function (company, user) {
  if (user.connectFacebook) {
    return 'messenger'
  } else if (company.twilio) {
    return 'sms'
  } else {
    return ''
  }
}

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

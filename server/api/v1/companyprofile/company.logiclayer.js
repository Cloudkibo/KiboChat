exports.getPlatform = function (companyUser, body) {
  let userUpdated = {}
  if (body.type === 'sms') {
    if (companyUser.twilioWhatsApp) {
      userUpdated = {platform: 'whatsApp'}
    } else {
      userUpdated = {platform: 'messenger'}
    }
  } else if (body.type === 'whatsApp') {
    if (companyUser.twilio) {
      userUpdated = {platform: 'sms'}
    } else {
      userUpdated = {platform: 'messenger'}
    }
  }
  return userUpdated
}

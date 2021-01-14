exports.getCreateSubscriptionPayload = function (platform, subscriber) {
  let payload
  if (platform === 'whatsApp') {
    payload = {
      companyId: subscriber.companyId,
      platform: 'whatsApp',
      alertChannel: 'whatsApp',
      channelId: subscriber.number,
      userName: subscriber.name
    }
  } else {
    payload = {
      companyId: subscriber.companyId,
      platform: 'messenger',
      alertChannel: 'messenger',
      channelId: subscriber.senderId,
      userName: subscriber.firstName + ' ' + subscriber.lastName,
      profilePic: subscriber.profilePic,
      pageId: subscriber.pageId._id ? subscriber.pageId._id : subscriber.pageId
    }
  }
  return payload
}

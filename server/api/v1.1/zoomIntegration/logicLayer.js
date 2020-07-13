exports.prepareZoomMeetingPayload = (data, meeting) => {
  const payload = {
    userId: data.userId,
    companyId: data.companyId,
    subscriberId: data.subscriberId,
    zoomUserId: data.zoomUserId,
    topic: data.topic,
    agenda: data.agenda,
    invitationMessage: data.invitationMessage.replace('[invite_url]', meeting.join_url),
    meetingUrl: meeting.join_url
  }
  return payload
}

exports.generatePassword = () => {
  const length = 8
  const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  let retVal = ''
  for (let i = 0; i < length; ++i) {
    retVal += charset.charAt(Math.floor(Math.random() * charset.length))
  }
  return retVal
}

exports.checkRateLimit = (zoomUser) => {
  let payload = {}
  if (zoomUser.meetingsPerDay) {
    const hours = (new Date() - new Date(zoomUser.meetingsPerDay.datetime)) / 3600000
    if (hours <= 24 && zoomUser.meetingsPerDay.apiCalls < 100) {
      payload = {
        hours,
        limitReached: false
      }
    } else {
      payload = {
        hours,
        limitReached: true
      }
    }
  } else {
    payload = {
      hours: 25,
      limitReached: false
    }
  }
  return payload
}

exports.prepareZoomMeetingPayload = (data, meeting) => {
  const payload = {
    userId: data.userId,
    companyId: data.companyId,
    subscriberId: data.subscriberId,
    topic: data.topic,
    agenda: data.agenda,
    invitationMessage: data.invitationMessage.replace('[invite_url]', meeting.join_url),
    meetingUrl: meeting.join_url
  }
  return payload
}

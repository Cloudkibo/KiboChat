exports.prepareChat = (body, companyUser) => {
  let MessageObject = {
    senderNumber: body.senderNumber,
    recipientNumber: body.recipientNumber,
    contactId: body.contactId,
    companyId: companyUser.companyId._id,
    payload: body.payload,
    repliedBy: body.repliedBy,
    status: 'seen'
  }
  return MessageObject
}
exports.setChatProperties = (fbchats) => {
  for (var i = 0; i < fbchats.length; i++) {
    fbchats[i].lastPayload = fbchats[fbchats.length - 1].payload
    fbchats[i].lastRepliedBy = fbchats[fbchats.length - 1].repliedBy
    fbchats[i].lastDateTime = fbchats[fbchats.length - 1].datetime
  }
  return fbchats
}
exports.getQueryData = (type, purpose, match, skip, sort, limit, group) => {
  if (type === 'count') {
    return {
      purpose,
      match,
      group: { _id: null, count: { $sum: 1 } }
    }
  } else {
    return {
      purpose,
      match,
      group,
      skip,
      sort,
      limit
    }
  }
}

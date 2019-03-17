exports.prepareChat = (body, companyUser) => {
  let MessageObject = {
    senderNumber: body.senderNumber,
    recipientNumber: body.recipientNumber,
    contactId: body.contactId,
    companyId: companyUser.companyId._id,
    payload: body.payload
  }
  return MessageObject
}

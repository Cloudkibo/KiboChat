exports.createPayload = function (companyUser, body) {
  let payload = {
    companyId: companyUser.companyId,
    pageId: body.pageId,
    reply: body.reply,
    ref_parameter: body.ref_parameter
  }
  if (body.sequenceId) {
    payload.sequenceId = body.sequenceId
  }
  return payload
}

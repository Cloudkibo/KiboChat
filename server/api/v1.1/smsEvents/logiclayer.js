exports.preparePayload = function (data) {
  let payload = {
    name: data.name,
    number: data.number,
    companyId: data.companyId,
    isSubscribed: true
  }
  if (data.listId !== 'master') {
    payload.listIds = [data.listId]
  }
  return payload
}

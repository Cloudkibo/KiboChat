const prepareSessionPayload = (subscriber, page) => {
  let payload = {
    subscriber_id: subscriber._id,
    page_id: page._id,
    company_id: page.companyId
  }

  return payload
}
const prepareUpdateSessionPayload = (lastActivityTime, status) => {
  let flag = true
  let temp = {}
  lastActivityTime ? temp.last_activity_time = lastActivityTime : flag = false
  status ? temp.status = status : flag = false
  return temp
}
exports.prepareSessionPayload = prepareSessionPayload
exports.prepareUpdateSessionPayload = prepareUpdateSessionPayload

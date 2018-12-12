exports.preparePayload = function (body, landingPageState, companyUser, landingPageSubmittedState) {
  let payload = {
    companyId: companyUser.companyId,
    pageId: body.pageId,
    initialState: landingPageState._id,
    submittedState: body.submittedState,
    optInMessage: body.optInMessage,
    title: body.title
  }
  if (landingPageSubmittedState) {
    payload.submittedState = {
      actionType: body.submittedState.actionType,
      state: landingPageSubmittedState._id
    }
  }
  return payload
}
exports.prepareUpdatePayload = function (body) {
  let paylaod = {
    optInMessage: body.optInMessage,
    isActive: body.isActive,
    title: body.title
  }
  if (body.submittedState.state) {
    paylaod.submittedState = {
      actionType: body.submittedState.actionType
    }
  } else {
    paylaod.submittedState = {
      actionType: body.submittedState.actionType,
      url: body.submittedState.url,
      tab: body.submittedState.tab
    }
  }
  return paylaod
}

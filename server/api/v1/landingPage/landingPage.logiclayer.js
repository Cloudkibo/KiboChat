exports.preparePayload = function (body, landingPageState, companyUser, landingPageSubmittedState) {
  let payload = {
    companyId: companyUser.companyId,
    pageId: body.pageId,
    initialState: landingPageState._id,
    submittedState: {},
    optInMessage: body.optInMessage,
    title: body.title
  }
  if (landingPageSubmittedState) {
    payload.submittedState = {
      actionType: body.submittedState.actionType,
      state: landingPageSubmittedState._id,
      title: body.submittedState.title,
      description: body.submittedState.description,
      buttonText: body.submittedState.buttonText
    }
  } else {
    payload.submittedState = {
      actionType: body.submittedState.actionType,
      url: body.submittedState.url,
      tab: body.submittedState.tab,
      title: body.submittedState.title,
      description: body.submittedState.description,
      buttonText: body.submittedState.buttonText
    }
  }
  return payload
}
exports.prepareUpdatePayload = function (body) {
  let paylaod = body
  if (body.submittedState.state) {
    paylaod.submittedState = {
      actionType: body.submittedState.actionType,
      title: body.submittedState.title,
      description: body.submittedState.description,
      buttonText: body.submittedState.buttonText
    }
  } else {
    paylaod.submittedState = {
      actionType: body.submittedState.actionType,
      url: body.submittedState.url,
      tab: body.submittedState.tab,
      title: body.submittedState.title,
      description: body.submittedState.description,
      buttonText: body.submittedState.buttonText
    }
  }
  return paylaod
}

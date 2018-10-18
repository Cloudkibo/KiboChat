exports.setPermissions = function (payload) {
  let permissions = {
    apiPermission: payload.apiPermission,
    surveyPermission: payload.surveyPermission,
    subscriberPermission: payload.subscriberPermission,
    pollsPermission: payload.pollsPermission,
    pagesPermission: payload.pagesPermission,
    pagesAccessPermission: payload.pagesAccessPermission,
    menuPermission: payload.menuPermission,
    livechatPermission: payload.livechatPermission,
    autopostingPermission: payload.autopostingPermission,
    broadcastPermission: payload.broadcastPermission,
    invitationsPermission: payload.invitationsPermission,
    deleteAgentPermission: payload.deleteAgentPermission,
    inviteAgentPermission: payload.inviteAgentPermission,
    updateRolePermission: payload.updateRolePermission,
    deleteAdminPermission: payload.deleteAdminPermission,
    inviteAdminPermission: payload.inviteAdminPermission,
    membersPermission: payload.membersPermission,
    companyUpdatePermission: payload.companyUpdatePermission,
    companyPermission: payload.companyPermission,
    dashboardPermission: payload.dashboardPermission,
    customerMatchingPermission: payload.customerMatchingPermission,
    terminateService: payload.terminateService,
    upgradeService: payload.upgradeService,
    downgradeService: payload.downgradeService,
    billingPermission: payload.billingPermission
  }
  return permissions
}

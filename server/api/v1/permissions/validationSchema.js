exports.updatePermissions = {
  type: 'object',
  properties: {
    apiPermission: {
      type: 'boolean'
    },
    surveyPermission: {
      type: 'boolean'
    },
    subscriberPermission: {
      type: 'boolean'
    },
    pollsPermission: {
      type: 'boolean'
    },
    pagesPermission: {
      type: 'boolean'
    },
    pagesAccessPermission: {
      type: 'boolean'
    },
    menuPermission: {
      type: 'boolean'
    },
    livechatPermission: {
      type: 'boolean'
    },
    autopostingPermission: {
      type: 'boolean'
    },
    broadcastPermission: {
      type: 'boolean'
    },
    invitationsPermission: {
      type: 'boolean'
    },
    deleteAgentPermission: {
      type: 'boolean'
    },
    inviteAgentPermission: {
      type: 'boolean'
    },
    updateRolePermission: {
      type: 'boolean'
    },
    deleteAdminPermission: {
      type: 'boolean'
    },
    inviteAdminPermission: {
      type: 'boolean'
    },
    membersPermission: {
      type: 'boolean'
    },
    companyUpdatePermission: {
      type: 'boolean'
    },
    companyPermission: {
      type: 'boolean'
    },
    dashboardPermission: {
      type: 'boolean'
    },
    customerMatchingPermission: {
      type: 'boolean'
    },
    terminateService: {
      type: 'boolean'
    },
    upgradeService: {
      type: 'boolean'
    },
    downgradeService: {
      type: 'boolean'
    },
    billingPermission: {
      type: 'boolean'
    }
  }
}
exports.update = {
  type: 'object',
  properties: {
    permissions: {
      type: 'object',
      required: true
    }
  }
}
exports.create = {
  type: 'object',
  properties: {
    name: {
      type: 'string',
      required: true
    }
  }
}

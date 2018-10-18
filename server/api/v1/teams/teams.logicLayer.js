/*
This file will contain the functions for logic layer.
By separating it from controller, we are separating the concerns.
Thus we can use it from other non express callers like cron etc
*/

exports.getTeamPayload = function (req, companyUser) {
  let teamPayload = {
    name: req.body.name,
    description: req.body.description,
    created_by: req.user._id,
    companyId: companyUser.companyId,
    teamPages: req.body.teamPages,
    teamPagesIds: req.body.pageIds
  }
  return teamPayload
}

exports.getTeamAgentsPayload = function (team, companyUser, agentId) {
  let teamAgentsPayload = {
    teamId: team._id,
    companyId: companyUser.companyId,
    agentId: agentId
  }
  return teamAgentsPayload
}

exports.getTeamPagesPayload = function (team, companyUser, pageId) {
  let teamPagesPayload = {
    teamId: team._id,
    pageId: pageId,
    companyId: companyUser.companyId
  }
  return teamPagesPayload
}

exports.getUpdateTeamPayload = function (body) {
  let teamPayload = {
    name: body.name,
    description: body.description,
    teamPages: body.teamPages,
    teamPagesIds: body.pageIds
  }
  return teamPayload
}

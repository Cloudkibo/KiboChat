/*
This file will contain the functions for logic layer.
By separating it from controller, we are separating the concerns.
Thus we can use it from other non express callers like cron etc
*/

exports.getTeamPayload = function (req, companyId) {
  let teamPayload = {
    name: req.body.name,
    description: req.body.description,
    created_by: req.user._id,
    companyId: companyId,
    platform: req.body.platform
  }
  if (req.body.teamPages && req.body.pageIds) {
    teamPayload.teamPages = req.body.teamPages
    teamPayload.teamPagesIds = req.body.pageIds
  }
  return teamPayload
}

exports.getTeamAgentsPayload = function (team, companyId, agentId) {
  let teamAgentsPayload = {
    teamId: team._id,
    companyId: companyId,
    agentId: agentId
  }
  return teamAgentsPayload
}

exports.getTeamPagesPayload = function (team, companyId, pageId) {
  let teamPagesPayload = {
    teamId: team._id,
    pageId: pageId,
    companyId: companyId
  }
  return teamPagesPayload
}

exports.getUpdateTeamPayload = function (body) {
  let teamPayload = {
    name: body.name,
    description: body.description
  }
  if (body.teamPages && body.teamPagesIds) {
    teamPayload.teamPages = body.teamPages
    teamPayload.teamPagesIds = body.teamPagesIds
  }
  return teamPayload
}

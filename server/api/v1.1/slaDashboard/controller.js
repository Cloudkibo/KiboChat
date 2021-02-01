const { callApi } = require('../utility')
const { kibodash } = require('../../global/constants').serverConstants
const logger = require('../../../components/logger')
const TAG = '/slaDashboard/controller.js'
const { sendSuccessResponse, sendErrorResponse } = require('../../global/response')

exports.index = function (req, res) {
  const datetime = new Date((new Date().getTime() - (req.body.days * 24 * 60 * 60 * 1000)))
  let query = {
    createdAt: {$gte: datetime},
    companyId: req.user.companyId,
    pageId: req.body.pageId,
    teamId: req.body.teamId,
    userId: req.body.userId
  }
  let request = callApi(`slaDashboard/pageWise/find`, 'post', query, kibodash)
  if (req.body.teamId) {
    request = callApi(`slaDashboard/teamWise/find`, 'post', query, kibodash)
  } else if (req.body.userId) {
    request = callApi(`slaDashboard/userWise/find`, 'post', query, kibodash)
  }
  request.then(results => {
    return sendSuccessResponse(res, 200, results)
  })
    .catch(err => {
      const message = err || 'Error at fetch sla dashboard info'
      logger.serverLog(message, `${TAG}: exports.index`, req.body, {query}, 'error')
      return sendErrorResponse(res, 500, null, 'Error at fetch sla dashboard info')
    })
}

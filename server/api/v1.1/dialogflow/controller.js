const { getDialogFlowClient } = require('../../global/dialogflow')
const { sendErrorResponse, sendSuccessResponse } = require('../../global/response')
const logger = require('../../../components/logger')
const TAG = '/api/v1.1/dialogflow/controller.js'

exports.fetchAgents = async function (req, res) {
  try {
    const dialogflow = await getDialogFlowClient(req.user.companyId)
    const result = await dialogflow.projects.agent.search({ parent: 'projects/-' })
    if (result && result.data && result.data.agents) {
      sendSuccessResponse(res, 200, result.data.agents)
    } else {
      throw new Error('An unexpected error occured. Please try again later.')
    }
  } catch (err) {
    const message = err || 'Failed to fetch dialogflow agents'
    logger.serverLog(message, `${TAG}: exports.fetchAgents`, {}, {user: req.user}, 'error')
    sendErrorResponse(res, 500, '', `Failed to update integration ${err}`)
  }
}

const {google} = require('googleapis')
const config = require('../../config/environment')
const { callApi } = require('../v1.1/utility')

exports.getDialogFlowClient = function (companyId) {
  return new Promise(async (resolve, reject) => {
    try {
      const keys = require(config.DIALOGFLOW_OAUTH_KEYS)

      const oAuth2Client = new google.auth.OAuth2(
        keys.web.client_id,
        keys.web.client_secret,
        config.DIALOGFLOW_OAUTH_REDIRECT_URI
      )

      const integrations = await callApi(`integrations/query`, 'post', { companyId, integrationName: 'DIALOGFLOW' })
      if (integrations.length > 0) {
        const tokens = integrations[0].integrationPayload
        oAuth2Client.setCredentials(tokens)
        const dialogflow = await google.dialogflow({ version: 'v2', auth: oAuth2Client })
        resolve(dialogflow)
      } else {
        reject(new Error('DialogFlow integration not found!'))
      }
    } catch (err) {
      reject(err)
    }
  })
}

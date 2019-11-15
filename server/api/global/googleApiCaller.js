const {JWT} = require('google-auth-library')
const config = require('../../config/environment')

async function callGoogleApi (url, method = 'GET', data) {
  const keys = require(config.GCP_CREDENTIALS_FILE)
  const client = new JWT({
    email: keys.client_email,
    key: keys.private_key,
    scopes: ['https://www.googleapis.com/auth/cloud-platform', 'https://www.googleapis.com/auth/dialogflow']
  })
  const res = await client.request({
    url,
    method,
    data: JSON.stringify(data)
  })
  return res
}

exports.callGoogleApi = callGoogleApi

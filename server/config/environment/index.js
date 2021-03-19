const path = require('path')
const _ = require('lodash')

const all = {
  env: process.env.NODE_ENV,

  secrets: {
    session: process.env.SESSION_SECRET || 'some string'
  },

  // Project root path
  root: path.normalize(`${__dirname}/../../..`),

  ip: process.env.IP || undefined,

  userRoles: ['buyer', 'admin', 'supervisor', 'agent'],

  // Mongo Options
  mongo: {
    options: {
      db: {
        safe: true
      }
    }
  },
  allowedIps: ['::ffff:142.93.66.26', '::ffff:165.227.178.70', '::ffff:167.99.56.161', '::ffff:159.65.47.134', '::ffff:159.203.175.244', '::ffff:159.89.185.221', '::ffff:165.227.66.158', '::ffff:104.131.67.58', '::ffff:165.227.130.222', '::ffff:127.0.0.1'],
  kiboAPIIP: ['::ffff:142.93.66.26', '::ffff:127.0.0.1'],
  ignoreSMP: ['103839534565995'],

  GCP_CREDENTIALS_FILE: process.env.GCP_CREDENTIALS_FILE || '/Users/cloudkibo/GCPCredentials/smart-reply-dev-66c9c58c745e.json',
  GOOGLE_ORGANIZATION_ID: process.env.GOOGLE_ORGANIZATION_ID || '652438098598',
  twilio: {
    sid: 'ACdeb74ff803b2e44e127d0570e6248b3b',
    token: '5c13521c7655811076a9c04d88fac395',
    number: '+14254286230'
  },
  sendgrid: {
    username: process.env.SENDGRID_USERNAME,
    password: process.env.SENDGRID_PASSWORD
  },
  SENDGRID_API_KEY: process.env.SENDGRID_API_KEY || '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',
  shopify: {
    app_key: process.env.SHOPIFY_KEY || '10128033d2dc6948f383edf548c2aa87',
    app_host: 'https://kibochat.cloudkibo.com',
    app_secret: process.env.SHOPIFY_SECRET || 'f41a001b86c700915c9cedc52b955d35'
  },
  bigcommerce: {
    client_id: process.env.BIGCOMMERCE_CLIENT_ID || '5bsotbk9bdq3wwiejhc6y014h1p2tje',
    app_host: 'https://kibochat.cloudkibo.com',
    app_secret: process.env.BIGCOMMERCE_SECRET || 'ee31988bcd4facf96a23f5d79aa3848fc5fab62c4ae31fb35125bc98ecb23949'
  },
  aviationKey: process.env.AVIATION_KEY || '73777d3f32d28cde6c37c177572283b6',
  openWeatherMapApi: process.env.WEATHER_KEY || '3334c233797078b7ca8a05154e545293',
  amadeus: {
    clientId: process.env.AMADEUS_CLIENT_ID || 'KYhArZE25YzQZcwFknz3Zj9AQntxwdFl',
    clientSecret: process.env.AMADEUS_SECRET || 'n6SsqjZ6cfcPbXgS'
  },
  openExchangeRateKey: '2fd5951a2cb045c2bdda9ed3e209cc2f',
  DIALOGFLOW_OAUTH_KEYS: process.env.DIALOGFLOW_OAUTH_KEYS || '/Users/imranshoukat/CloudKibo/GCPCredentials/dialogflow-oauth-keys',
  DIALOGFLOW_OAUTH_REDIRECT_URI: process.env.DIALOGFLOW_OAUTH_REDIRECT_URI || 'https://kibochat.ngrok.io/auth/dialogflow/callback'
}

module.exports = _.merge(
  all,
  require(`./${process.env.NODE_ENV}.js`) || {})

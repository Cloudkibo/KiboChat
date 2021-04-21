process.env.NODE_ENV = process.env.NODE_ENV || 'development' // production

const express = require('express')
const Sentry = require('@sentry/node')
const config = require('./config/environment/index')

const cron = require('node-cron')
const AbandonedScriptShopify = require('./scripts/abandonedScriptShopify.js')
const NotificationsScript = require('./scripts/messageAlerts/notificationsScript.js')
const SessionTimeOutScript = require('./scripts/messageAlerts/sessionTimeOutScript.js')
const WhatsappScript = require('./scripts/whatsappDeleteDataScript.js')
const { slaDashboardScript } = require('./scripts/slaDashboard')
const { resetUsage } = require('./scripts/billingPricing/resetUsage.js')

const app = express()
const httpApp = express()

const appObj = (config.env === 'production' || config.env === 'staging') ? app : httpApp

/* if (config.env === 'production' || config.env === 'staging') {
  const Raven = require('raven')
  Raven.config('https://6c7958e0570f455381d6f17122fbd117:d2041f4406ff4b3cb51290d9b8661a7d@sentry.io/292307', {
    environment: config.env,
    parseUser: ['name', 'email', 'domain', 'role', 'emailVerified']
  }).install()
  appObj.use(Raven.requestHandler())
} */

if (config.env === 'production' || config.env === 'staging') {
  Sentry.init({
    dsn: 'https://6c7958e0570f455381d6f17122fbd117@o132281.ingest.sentry.io/292307',
    release: 'KiboChat@1.0.0',
    environment: config.env,
    serverName: 'KiboChat',
    sendDefaultPii: true
  })
}

cron.schedule('* * * * *', NotificationsScript.runLiveChatNotificationScript)
cron.schedule('0 */2 * * *', AbandonedScriptShopify.runScript) // runs after every 2 hours
cron.schedule('*/30 * * * *', SessionTimeOutScript.runSessionTimeOutScript)
cron.schedule('0 13 * * *', WhatsappScript.runWhatspdeleteScript) //  daily 6 pm pakistan time
cron.schedule('0 0 * * *', slaDashboardScript)
cron.schedule('0 0 1 * *', resetUsage)

require('./config/express')(appObj)
require('./config/setup')(app, httpApp, config)
require('./routes')(appObj)
require('./api/global/messageStatistics').connectRedis()

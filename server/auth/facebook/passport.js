/**
 * Created by sojharo on 24/07/2017.
 */

const passport = require('passport')
const FacebookStrategy = require('passport-facebook').Strategy
const PassportFacebookExtension = require('passport-facebook-extension')
const needle = require('needle')
const _ = require('lodash')

const logger = require('../../components/logger')
const TAG = 'api/auth/facebook/passport'

const options = {
  headers: {
    'X-Custom-Header': 'CloudKibo Web Application'
  },
  json: true
}

exports.setup = function (User, config) {
  passport.use(new FacebookStrategy(
    {
      clientID: config.facebook.clientID,
      clientSecret: config.facebook.clientSecret,
      callbackURL: config.facebook.callbackURL,
      profileFields: ['id', 'displayName', 'photos', 'email']
    },
    (accessToken, refreshToken, profile, done) => {
      if (profile._json) {
        logger.serverLog(TAG, `facebook auth done for: ${
          profile._json.name} with fb id: ${profile._json.id}`)
      }

      let FBExtension = new PassportFacebookExtension(config.facebook.clientID,
        config.facebook.clientSecret)

      // todo do this for permissions error
      FBExtension.permissionsGiven(profile.id, accessToken)
        .then(permissions => {
          profile.permissions = permissions
          logger.serverLog(TAG,
            `Permissions given: ${JSON.stringify(profile.permissions)}`)
        })
        .fail(e => {
          logger.serverLog(TAG, `Permissions check error: ${e}`)
        })

      FBExtension.extendShortToken(accessToken).then((error) => {
        logger.serverLog(TAG, `Extending token error: ${JSON.stringify(error)}`)
        return done(error)
      }).fail((response) => {
        accessToken = response.access_token
        needle.get(`${'https://graph.facebook.com/me?fields=' +
        'id,name,locale,email,timezone,gender,picture' +
        '&access_token='}${accessToken}`, options, (err, resp) => {
          if (err !== null) {
            logger.serverLog(TAG, 'error from graph api to get user data: ')
            logger.serverLog(TAG, JSON.stringify(err))
          }
          logger.serverLog(TAG, JSON.stringify(resp.body))

          if (err) return done(err)

          let payload = {
            name: resp.body.name,
            locale: resp.body.locale,
            gender: resp.body.gender,
            provider: 'facebook',
            timezone: resp.body.timezone,
            profilePic: resp.body.picture.data.url,
            fbToken: accessToken,
            fbId: resp.body.id
          }

          if (resp.body.email) {
            payload = _.merge(payload, {email: resp.body.email})
          }

          done(null, payload)
        })
      })
    }
  ))
}

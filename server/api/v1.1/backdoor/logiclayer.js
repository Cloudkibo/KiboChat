
exports.getActingAsUserPayload = function (req, actingUser, platforms) {
  let updated = {}
  if (req.body.type === 'set') {
    updated = {
      actingAsUser: {domain_email: actingUser.domain_email, actingUser: actingUser, platforms: platforms, superUserPlatform: req.user.platform},
      platform: actingUser.platform
    }
  } else {
    updated = {
      $unset: {actingAsUser: 1},
      platform: req.user.actingAsUser.superUserPlatform
   }
  }
  return updated
}
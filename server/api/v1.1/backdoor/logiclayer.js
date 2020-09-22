exports.getActingAsUserPayload = function (body, actingUser) {
  let updated = {}
  if (req.body.type === 'set') {
    updated = {
      actingAsUser: {domain_email: body.domain_email, name: body.name, actingUserplatform: actingUser.platform}
    }
  } else {
    updated = {
      $unset: {actingAsUser: 1},
      platform: req.user.actingAsUser.superUserPlatform
   }
  }
  return updated
}
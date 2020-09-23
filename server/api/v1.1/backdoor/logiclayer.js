exports.getActingAsUserPayload = function (body, actingUser) {
  let updated = {}
  if (body.type === 'set') {
    updated = {
      actingAsUser: {domain_email: body.domain_email, name: body.name, actingUserplatform: actingUser.platform}
    }
  } else {
    updated = {
      $unset: {actingAsUser: 1}
   }
  }
  return updated
}
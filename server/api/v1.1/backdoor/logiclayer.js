exports.getActingAsUserPayload = function (body) {
  let updated = {}
  if (body.type === 'set') {
    updated = {
      actingAsUser: {domain_email: body.domain_email, name: body.name}
    }
  } else {
    updated = {$unset: {actingAsUser: 1}}
  }
  return updated
}

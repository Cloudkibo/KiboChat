const Sentry = require('@sentry/node')

exports.sendAlert = function (message, path, data, otherInfo, level) {
  const title = message instanceof Error ? message : new Error(JSON.stringify(message))
  Sentry.withScope(scope => {
    scope.setExtra('path', path)
    scope.setExtra('data', JSON.stringify(data))
    scope.setExtra('otherInfo', JSON.stringify(otherInfo))
    scope.setLevel('level', level)
    Sentry.captureException(title)
  })
}

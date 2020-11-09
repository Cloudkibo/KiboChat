const Raven = require('raven')

exports.sendAlert = function (message, path, data, otherInfo, level) {
  try {
    throw new Error(message)
  } catch (e) {
    const title = message instanceof Error ? message : e
    Raven.context(() => {
      Raven.captureException(title, {
        extra: {path, data, otherInfo},
        level
      })
    })
  }
}
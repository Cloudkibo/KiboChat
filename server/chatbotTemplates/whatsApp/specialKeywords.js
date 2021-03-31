exports.SPECIALKEYWORDS = [
  'home', 'back', 'yes', 'no'
]

exports.transformSpecialKeywords = function (text) {
  switch (text) {
    case 'home':
      return 'hi'
    case 'back':
      return 'b'
    case 'yes':
      return 'y'
    case 'no':
      return 'n'
    default:
      return text
  }
}

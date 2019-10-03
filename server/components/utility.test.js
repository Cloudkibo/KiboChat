const { validateUrl, getSendGridObject } = require('./utility.js')

describe('Validate url test in utility', () => {
  test('should validate correct Urls', () => {
    expect(validateUrl('https://www.yahoo.com')).toBe(true)
    expect(validateUrl('https://app.yahoo.com')).toBe(true)
    expect(validateUrl('https://socket.io')).toBe(true)
  })
  test('should invalidate incorrect Urls', () => {
    expect(validateUrl('https:/app.yahoo.com')).toBe(false)
    expect(validateUrl('htt://app.yahoo.com')).toBe(false)
    expect(validateUrl('https://appcom')).toBe(false)
  })
})

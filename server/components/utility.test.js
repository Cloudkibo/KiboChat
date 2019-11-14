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
    expect(validateUrl('')).toBe(false)
  })
})

describe('Give date difference in days in utility', () => {
  test('should give date differnce in days correctly', () => {
    let d1 = new Date('10/10/2019')
    let d2 = new Date('10/16/2019')
    expect(dateDiffInDays(d1, d2)).toBe(6)
  })
})

describe('Pad with zeros function', () => {
  test('should pad a number with zeros correctly', () => {
    expect(padWithZeros(4, 2)).toBe("04")
    expect(padWithZeros(4, 3)).toBe("004")
    expect(padWithZeros(14, 2)).toBe("14")
  })
})

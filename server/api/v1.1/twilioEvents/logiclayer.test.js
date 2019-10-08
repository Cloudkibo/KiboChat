const { getPayload, prepareChat } = require('./logiclayer.js')

describe('Validate getPayload', () => {
  test('give payload of componentType file', () => {
    let input = { MediaContentType0: 'application/pdf',
      SmsMessageSid: 'MM480be7d65160706e5e85d3f8992bf6bb',
      NumMedia: '1',
      SmsSid: 'MM480be7d65160706e5e85d3f8992bf6bb',
      SmsStatus: 'received',
      Body: '14623-45105-1-SM',
      To: 'whatsapp:+14155238886',
      NumSegments: '1',
      MessageSid: 'MM480be7d65160706e5e85d3f8992bf6bb',
      AccountSid: 'ACe779810d0b992e2db1b67716bd2b4d80',
      From: 'whatsapp:+923322846897',
      MediaUrl0:
   'https://api.twilio.com/2010-04-01/Accounts/ACe779810d0b992e2db1b67716bd2b4d80/Messages/MM480be7d65160706e5e85d3f8992bf6bb/Media/ME8478f2013fc89641835620f8ad1f334c',
      ApiVersion: '2010-04-01' }
    let output = [{componentType: 'file', fileurl: {url: 'https://api.twilio.com/2010-04-01/Accounts/ACe779810d0b992e2db1b67716bd2b4d80/Messages/MM480be7d65160706e5e85d3f8992bf6bb/Media/ME8478f2013fc89641835620f8ad1f334c'}, fileName: `14623-45105-1-SM.pdf`}]
    expect(getPayload(input)).toEqual(output)
  })
  test('give payload of componentType image', () => {
    let input = { MediaContentType0: 'image/jpeg',
      SmsMessageSid: 'MMc74c8207e65fd1d819189ac2530f384a',
      NumMedia: '1',
      SmsSid: 'MMc74c8207e65fd1d819189ac2530f384a',
      SmsStatus: 'received',
      Body: '',
      To: 'whatsapp:+14155238886',
      NumSegments: '1',
      MessageSid: 'MMc74c8207e65fd1d819189ac2530f384a',
      AccountSid: 'ACe779810d0b992e2db1b67716bd2b4d80',
      From: 'whatsapp:+923322846897',
      MediaUrl0:
       'https://api.twilio.com/2010-04-01/Accounts/ACe779810d0b992e2db1b67716bd2b4d80/Messages/MMc74c8207e65fd1d819189ac2530f384a/Media/ME2fc0d06234e3e21ff24a56f63567f3b1',
      ApiVersion: '2010-04-01' }
    let output = [{componentType: 'image', fileurl: {url: 'https://api.twilio.com/2010-04-01/Accounts/ACe779810d0b992e2db1b67716bd2b4d80/Messages/MMc74c8207e65fd1d819189ac2530f384a/Media/ME2fc0d06234e3e21ff24a56f63567f3b1'}}]
    expect(getPayload(input)).toEqual(output)
  })
  test('give payload of componentType text', () => {
    let input = { SmsMessageSid: 'SM471169d409a6d8b92a96dd027d40d820',
      NumMedia: '0',
      SmsSid: 'SM471169d409a6d8b92a96dd027d40d820',
      SmsStatus: 'received',
      Body: 'Ndj',
      To: 'whatsapp:+14155238886',
      NumSegments: '1',
      MessageSid: 'SM471169d409a6d8b92a96dd027d40d820',
      AccountSid: 'ACe779810d0b992e2db1b67716bd2b4d80',
      From: 'whatsapp:+923322846897',
      ApiVersion: '2010-04-01' }
    let output = [{componentType: 'text', text: 'Ndj'}]
    expect(getPayload(input)).toEqual(output)
  })
  test('give payload of componentType video', () => {
    let input = { MediaContentType0: 'video/mp4',
      SmsMessageSid: 'MM86f7b0592e8b80c273172d74b3cedc2d',
      NumMedia: '1',
      SmsSid: 'MM86f7b0592e8b80c273172d74b3cedc2d',
      SmsStatus: 'received',
      Body: '',
      To: 'whatsapp:+14155238886',
      NumSegments: '1',
      MessageSid: 'MM86f7b0592e8b80c273172d74b3cedc2d',
      AccountSid: 'ACe779810d0b992e2db1b67716bd2b4d80',
      From: 'whatsapp:+923322846897',
      MediaUrl0:
       'https://api.twilio.com/2010-04-01/Accounts/ACe779810d0b992e2db1b67716bd2b4d80/Messages/MM86f7b0592e8b80c273172d74b3cedc2d/Media/ME7ab4165bbf67898540c8b37155022c46',
      ApiVersion: '2010-04-01' }
    let output = [{componentType: 'video', fileurl: {url: 'https://api.twilio.com/2010-04-01/Accounts/ACe779810d0b992e2db1b67716bd2b4d80/Messages/MM86f7b0592e8b80c273172d74b3cedc2d/Media/ME7ab4165bbf67898540c8b37155022c46'}}]
    expect(getPayload(input)).toEqual(output)
  })
  test('give payload of componentType text and image', () => {
    let input = { MediaContentType0: 'image/jpeg',
      SmsMessageSid: 'MM7b6abbceb3679263325f952083feac60',
      NumMedia: '1',
      SmsSid: 'MM7b6abbceb3679263325f952083feac60',
      SmsStatus: 'received',
      Body: 'Bee',
      To: 'whatsapp:+14155238886',
      NumSegments: '1',
      MessageSid: 'MM7b6abbceb3679263325f952083feac60',
      AccountSid: 'ACe779810d0b992e2db1b67716bd2b4d80',
      From: 'whatsapp:+923322846897',
      MediaUrl0:
       'https://api.twilio.com/2010-04-01/Accounts/ACe779810d0b992e2db1b67716bd2b4d80/Messages/MM7b6abbceb3679263325f952083feac60/Media/MEd39db4583bfd79210abc0503f006f69a',
      ApiVersion: '2010-04-01' }
    let output = [
      {componentType: 'text', text: 'Bee'},
      {componentType: 'image', fileurl: {url: 'https://api.twilio.com/2010-04-01/Accounts/ACe779810d0b992e2db1b67716bd2b4d80/Messages/MM7b6abbceb3679263325f952083feac60/Media/MEd39db4583bfd79210abc0503f006f69a'}}]
    expect(getPayload(input)).toEqual(output)
  })
  test('give empty payload', () => {
    let input = { SmsMessageSid: 'SM4e55bf123d543f1d0b6158b5585dc7ee',
      NumMedia: '0',
      SmsSid: 'SM4e55bf123d543f1d0b6158b5585dc7ee',
      SmsStatus: 'received',
      Body: '',
      To: 'whatsapp:+14155238886',
      NumSegments: '1',
      MessageSid: 'SM4e55bf123d543f1d0b6158b5585dc7ee',
      AccountSid: 'ACe779810d0b992e2db1b67716bd2b4d80',
      From: 'whatsapp:+923322846897',
      ApiVersion: '2010-04-01' }
    let output = []
    expect(getPayload(input)).toEqual(output)
  })
})
describe('Validate prepareChat', () => {
  test('give preparedChat', () => {
    let output = {
      senderNumber: '+923322846899',
      recipientNumber: '+14155238886',
      contactId: '5d95c34e1de5a52fff402231',
      companyId: '5aa10cdf46b4591f60e6b50c',
      payload: {componentType: 'text', text: 'Bee'},
      status: 'unseen',
      format: 'twilio'
    }
    expect(prepareChat('+923322846899', '+14155238886', {_id: '5d95c34e1de5a52fff402231', companyId: '5aa10cdf46b4591f60e6b50c'}, {componentType: 'text', text: 'Bee'})).toEqual(output)
  })
})

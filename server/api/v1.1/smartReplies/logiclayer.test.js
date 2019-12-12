const { createDialoFlowIntentData } = require('./smartReplies.logicLayer.js')

describe('Validate createDialoFlowIntentData in smartReplies.logicLayer.js', () => {
  test('validate undefined questions', () => {
    expect(() => {
      createDialoFlowIntentData({name: 'Intent Name'})
    }).toThrowError(Error('Questions field is required and it cannot be an empty array!'))
  })

  test('validate empty questions', () => {
    expect(() => {
      createDialoFlowIntentData({questions: [], name: 'Intent Name'})
    }).toThrowError(Error('Questions field is required and it cannot be an empty array!'))
  })

  test('validate undefined name', () => {
    expect(() => {
      createDialoFlowIntentData({questions: ['How are you?']})
    }).toThrowError(Error('Name field is required and cannot be an empty string!'))
  })

  test('validate empty name', () => {
    expect(() => {
      createDialoFlowIntentData({questions: ['How are you?'], name: ''})
    }).toThrowError(Error('Name field is required and cannot be an empty string!'))
  })

  let body = {
    questions: ['How are you?', 'What are you doing?', 'Why are you doing this?'],
    name: 'Intent Name'
  }

  test('testing createDialoFlowIntentData', () => {
    const result = createDialoFlowIntentData(body)
    const expectedObject = {
      displayName: 'Intent Name',
      trainingPhases: [
        {
          'type': 'TYPE_UNSPECIFIED',
          'parts': [
            {
              'text': 'How are you?'
            }
          ]
        },
        {
          'type': 'TYPE_UNSPECIFIED',
          'parts': [
            {
              'text': 'What are you doing?'
            }
          ]
        },
        {
          'type': 'TYPE_UNSPECIFIED',
          'parts': [
            {
              'text': 'Why are you doing this?'
            }
          ]
        }
      ]
    }
    expect(result).toMatchObject(expectedObject)
  })
})

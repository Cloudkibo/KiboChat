exports.createDialoFlowData = (data) => {
  const questions = data.questions
  let result = {
    displayName: data.name,
    trainingPhases: []
  }
  for (let i = 0; i < questions.length; i++) {
    let question = questions[i]
    result.trainingPhases.push({
      'type': 'TYPE_UNSPECIFIED',
      'parts': [
        {
          'text': question
        }
      ]
    })
  }
  return result
}

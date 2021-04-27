exports.prepareChatbotPayload = (company, subscriber, data, options) => {
  let message = {
    from: company.number,
    to: subscriber.number
  }
  return new Promise((resolve, reject) => {
    if (data.componentType === 'text') {
      message.body = data.text + _appendOptions(options)
    } else if (['image', 'file', 'audio', 'video', 'media'].includes(data.componentType)) {
      message.mediaUrl = data.fileurl.url
    } else if (data.componentType === 'card') {
      message.body = data.url
    }
    resolve(message)
  })
}

const _appendOptions = (options) => {
  let text = ''
  if (options.length > 0) {
    for (let i = 0; i < options.length; i++) {
      text += `\n${_convertToEmoji(('0' + i).slice(-2))}: ${options[i].title}`
    }
  }
  return text
}

const _convertToEmoji = (num) => {
  const numbers = ['0️⃣', '1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣']
  let emoji = ''
  for (let i = 0; i < num.length; i++) {
    emoji += numbers[parseInt(num.charAt(i))]
  }
  return emoji
}


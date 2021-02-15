function validateUrl (str) {
  let regexp = /^(?:(?:https?|ftp):\/\/)?(?:(?!(?:10|127)(?:\.\d{1,3}){3})(?!(?:169\.254|192\.168)(?:\.\d{1,3}){2})(?!172\.(?:1[6-9]|2\d|3[0-1])(?:\.\d{1,3}){2})(?:[1-9]\d?|1\d\d|2[01]\d|22[0-3])(?:\.(?:1?\d{1,2}|2[0-4]\d|25[0-5])){2}(?:\.(?:[1-9]\d?|1\d\d|2[0-4]\d|25[0-4]))|(?:(?:[a-z\u00a1-\uffff0-9]-*)*[a-z\u00a1-\uffff0-9]+)(?:\.(?:[a-z\u00a1-\uffff0-9]-*)*[a-z\u00a1-\uffff0-9]+)*(?:\.(?:[a-z\u00a1-\uffff]{2,})))(?::\d{2,5})?(?:\/\S*)?$/
  if (regexp.test(str)) {
    return true
  } else {
    return false
  }
}

function padWithZeros (n, width, z) {
  z = z || '0'
  n = n + ''
  let result = n.length >= width ? n : new Array(width - n.length + 1).join(z) + n
  return result
}

function dateDiffInDays (date1, date2) {
  const diffTime = Math.abs(date2 - date1)
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  return diffDays
}

exports.intervalForEach = (array, iteratee, delay) => {
  let current = 0

  const interval = setInterval(() => {
    if (current === array.length) {
      clearInterval(interval)
    } else {
      iteratee(array[current])
      current++
    }
  }, delay)
}

exports.isYouTubeUrl = (url) => {
  var p = /^(?:https?:\/\/)?(?:www\.)?(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))((\w|-){11})(?:\S+)?$/
  return (url.match(p)) ? RegExp.$1 : false
}

exports.isFacebookVideoUrl = (url) => {
// eslint-disable-next-line no-useless-escape
  let regExp = /^(?:(?:https?:)?\/\/)?(?:www\.)?(web.)?facebook\.com\/[a-zA-Z0-9\.]+\/videos\/(?:[a-zA-Z0-9\.]+\/)?([0-9]+)\/?$/g
  return (regExp.test(url))
}

exports.getTrackingUrl = (trackingDetails) => {
  let trackingUrl = ''
  switch (trackingDetails.company.toLowerCase()) {
    case 'tcs': {
      trackingUrl = 'https://www.tcsexpress.com/Tracking'
      break
    }
    case 'trax': {
      trackingUrl = `https://sonic.pk/tracking?tracking_number=${trackingDetails.number}`
      break
    }
    case 'swyft': {
      trackingUrl = `http://parceltracking.swyftlogistics.com/?${trackingDetails.number}`
      break
    }
    case 'call courier': {
      trackingUrl = `https://callcourier.com.pk/tracking/?tc=${trackingDetails.number}`
      break
    }
    case 'dhl': {
      trackingUrl = `https://www.dhl.com/en/express/tracking.html?AWB=${trackingDetails.number}&brand=DHL`
      break
    }
    case 'tpl': {
      trackingUrl = `https://tpltrakker.com/`
      break
    }
    default: {
      trackingUrl = ''
    }
  }
  return trackingUrl
}

const truncate = (input, size) => input.length > size ? `${input.substring(0, size)}...` : input

exports.validateUrl = validateUrl
exports.padWithZeros = padWithZeros
exports.dateDiffInDays = dateDiffInDays
exports.truncate = truncate

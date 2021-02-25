// Web layer of this API node
const api = 'https://www.kroger.com/rx/api/anonymous'
const needle = require('needle')

const status = response => {
  console.log('response', response)
  if (response.status >= 200 && response.status < 300) {
    return Promise.resolve(response)
  } else {
    return Promise.reject(new Error(response.statusText))
  }
}

exports.index = function (req, res) {
  let abc = `${api}/stores?address=80152`
  console.log('path', abc)
  // needle(
  //   'get',
  //   abc
  // )
  //   .then(response => {
  //     console.log('response', response.body)
  //   })
  //   .catch((err) => {
  //     console.log('err', err)
  //   })
    needle.get(abc, function(error, response) {
      console.log('response')
    if (!error && response.statusCode == 200) {
      console.log(response.body);
    } else {
      console.log('error',error)
    }
  });
  // res.status(200).json({status: 'success', payload: 'Hello World'})
}

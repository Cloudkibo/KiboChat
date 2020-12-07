const airportsData = require('./data.js')
const airlinesData = require('./airlinesData.js')
const needle = require('needle')
const config = require('./../../../config/environment/index')

exports.findCityInfo = function (name) {
  const re = new RegExp(name, 'gi')
  const airports = []
  for (let i = 0; i < airportsData.length; i++) {
    const location = airportsData[i]['Location served']
    if (location.match(re)) {
      airports.push(airportsData[i])
    }
  }
  return airports
}

exports.findAirportInfo = function (name) {
  const re = new RegExp(name, 'gi')
  const airports = []
  for (let i = 0; i < airportsData.length; i++) {
    const location = airportsData[i]['Airport name']
    if (location.match(re)) {
      airports.push(airportsData[i])
    }
  }
  return airports
}

exports.findAirlineInfo = function (iata) {
  const airlines = []
  for (let i = 0; i < airlinesData.length; i++) {
    const location = airlinesData[i]['IATA']
    if (location === iata) {
      airlines.push(airlinesData[i])
    }
  }
  return airlines
}

exports.findWeatherInfo = function (city, date) {
  return new Promise(function (resolve, reject) {
    needle('get', `https://api.openweathermap.org/data/2.5/forecast?q=${city}&appid=${config.openWeatherMapApi}`)
      .then(result => {
        resolve(result.body.list[0].weather[0])
      })
      .catch(err => {
        reject(err)
      })
  })
}

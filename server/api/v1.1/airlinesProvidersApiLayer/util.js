const airportsData = require('./data.js')

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

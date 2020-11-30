const needle = require('needle')

const API_URL = 'https://api.aviationstack.com/v1'

exports.fetchAirlines = (credentials) => {
  const params = initAviation(credentials)
  return new Promise(function (resolve, reject) {
    needle('get', `${API_URL}/airlines?access_key=${params}`)
      .then(result => {
        let payload = result.data
        payload = payload.map(item => {
          return {
            'airline_name': item.airline_name,
            'iata_code': item.iata_code,
            'icao_code': item.icao_code,
            'callsign': item.callsign,
            'type': item.type,
            'status': item.status,
            'fleet_size': item.fleet_size,
            'fleet_average_age': item.fleet_average_age,
            'date_founded': item.date_founded,
            'hub_code': item.hub_code,
            'country_name': item.country_name,
            'country_iso2': item.country_iso2
          }
        })
        resolve(payload)
      })
      .catch(err => reject(err))
  })
}

exports.fetchCityInfo = (name, credentials) => {
  const params = initAviation(credentials)
  return new Promise(function (resolve, reject) {
    needle('get', `${API_URL}/cities?access_key=${params}&search=${name}`)
      .then(result => {
        let payload = result.data
        payload = payload.map(item => {
          return {
            'city_name': item.city_name,
            'iata_code': item.iata_code,
            'country_iso2': item.country_iso2,
            'latitude': item.latitude,
            'longitude': item.longitude,
            'timezone': item.timezone,
            'gmt': item.gmt,
            'geoname_id': item.geoname_id
          }
        })
        resolve(payload)
      })
      .catch(err => reject(err))
  })
}

exports.fetchAirportInfo = (name, credentials) => {
  const params = initAviation(credentials)
  return new Promise(function (resolve, reject) {
    needle('get', `${API_URL}/airports?access_key=${params}&search=${name}`)
      .then(result => {
        let payload = result.data
        payload = payload.map(item => {
          return {
            'airport_name': item.airport_name,
            'iata_code': item.iata_code,
            'icao_code': item.icao_code,
            'latitude': item.latitude,
            'longitude': item.longitude,
            'geoname_id': item.geoname_id,
            'timezone': item.timezone,
            'gmt': item.gmt,
            'phone_number': item.phone_number,
            'country_name': item.country_name,
            'country_iso2': item.country_iso2,
            'city_iata_code': item.city_iata_code
          }
        })
        resolve(payload)
      })
      .catch(err => reject(err))
  })
}

exports.fetchFlights = (depCity, arrCity, depTime, airlineName, credentials) => {
  const params = initAviation(credentials)
  return new Promise(function (resolve, reject) {
    needle('get', `${API_URL}/flights?access_key=${params}&airline_name=${airlineName}`)
      .then(result => {
        let payload = result.data
        payload = payload.map(item => {
          return {
            'flight_date': item.flight_date,
            'flight_status': item.flight_status,
            'airport_name': item.airport_name,
            'iata_code': item.iata_code,
            'icao_code': item.icao_code,
            'latitude': item.latitude,
            'longitude': item.longitude,
            'geoname_id': item.geoname_id,
            'timezone': item.timezone,
            'gmt': item.gmt,
            'phone_number': item.phone_number,
            'country_name': item.country_name,
            'country_iso2': item.country_iso2,
            'city_iata_code': item.city_iata_code
          }
        })
        resolve(payload)
      })
      .catch(err => reject(err))
  })
}

function initAviation (credentials) {
  const params = {
    access_key: credentials.access_key
  }
  return params
}

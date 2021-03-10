const needle = require('needle')

const API_URL = 'http://api.aviationstack.com/v1'

exports.fetchAirlines = (credentials) => {
  const params = initAviation(credentials)
  return new Promise(function (resolve, reject) {
    needle('get', `${API_URL}/airlines?access_key=${params}`)
      .then(result => {
        result = result.body
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
        result = result.body
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
        result = result.body
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

exports.fetchFlights = (depIata, arrIata, depTime, airlineName, credentials) => {
  const params = initAviation(credentials)
  depTime = new Date(depTime)
  depTime = `${depTime.getFullYear()}-${(depTime.getMonth() + 1)}-${depTime.getDate()}`
  let query = `dep_iata=${depIata}&arr_iata=${arrIata}&flight_status=scheduled`// &flight_date=${depTime}`
  if (airlineName) {
    query += `&airline_name=${airlineName}`
  }
  return new Promise(function (resolve, reject) {
    needle('get', `${API_URL}/flights?access_key=${params}&${query}`)
      .then(result => {
        result = result.body
        let payload = result.data
        payload = payload.map(item => {
          return {
            'flight_date': item.flight_date,
            'flight_status': item.flight_status,
            'departure': {
              'airport': item.departure.airport,
              'timezone': item.departure.timezone,
              'iata': item.departure.iata,
              'scheduled': item.departure.scheduled
            },
            'arrival': {
              'airport': item.arrival.airport,
              'timezone': item.arrival.timezone,
              'iata': item.arrival.iata,
              'scheduled': item.arrival.scheduled
            },
            'airline': {
              'name': item.airline.name,
              'iata': item.airline.iata,
              'icao': item.airline.icao
            },
            'flight': {
              'number': item.flight.number,
              'iata': item.flight.iata
            }
            // 'aircraft': {
            //   'registration': item.aircraft.registration,
            //   'iata': item.aircraft.iata,
            //   'icao': item.aircraft.icao,
            //   'icao24': item.aircraft.icao24
            // },
            // 'live': {
            //   'updated': item.live.updated,
            //   'latitude': item.live.latitude,
            //   'longitude': item.live.longitude,
            //   'altitude': item.live.altitude,
            //   'direction': item.live.direction,
            //   'speed_horizontal': item.live.speed_horizontal,
            //   'speed_vertical': item.live.speed_vertical,
            //   'is_ground': item.live.is_ground
            // }
          }
        })
        resolve(payload)
      })
      .catch(err => reject(err))
  })
}

exports.fetchFlightByNumber = (flightNumber, credentials) => {
  const params = initAviation(credentials)
  let query = `flight_iata=${flightNumber}&flight_status=scheduled`
  return new Promise(function (resolve, reject) {
    needle('get', `${API_URL}/flights?access_key=${params}&${query}`)
      .then(result => {
        result = result.body
        let payload = result.data
        payload = payload.map(item => {
          return {
            'flight_date': item.flight_date,
            'flight_status': item.flight_status,
            'departure': {
              'airport': item.departure.airport,
              'timezone': item.departure.timezone,
              'iata': item.departure.iata,
              'icao': item.departure.icao,
              'terminal': item.departure.terminal,
              'gate': item.departure.gate,
              'delay': item.departure.delay,
              'scheduled': item.departure.scheduled,
              'estimated': item.departure.estimated,
              'actual': item.departure.actual,
              'estimated_runway': item.departure.estimated_runway,
              'actual_runway': item.departure.actual_runway
            },
            'arrival': {
              'airport': item.arrival.airport,
              'timezone': item.arrival.timezone,
              'iata': item.arrival.iata,
              'icao': item.arrival.icao,
              'terminal': item.arrival.terminal,
              'gate': item.arrival.gate,
              'baggage': item.arrival.baggage,
              'delay': item.arrival.delay,
              'scheduled': item.arrival.scheduled,
              'estimated': item.arrival.estimated,
              'actual': item.arrival.actual,
              'estimated_runway': item.arrival.estimated_runway,
              'actual_runway': item.arrival.actual_runway
            },
            'airline': {
              'name': item.airline.name,
              'iata': item.airline.iata,
              'icao': item.airline.icao
            },
            'flight': {
              'number': item.flight.number,
              'iata': item.flight.iata,
              'icao': item.flight.icao,
              'codeshared': item.flight.codeshared
            }
            // 'aircraft': {
            //   'registration': item.aircraft.registration,
            //   'iata': item.aircraft.iata,
            //   'icao': item.aircraft.icao,
            //   'icao24': item.aircraft.icao24
            // },
            // 'live': {
            //   'updated': item.live.updated,
            //   'latitude': item.live.latitude,
            //   'longitude': item.live.longitude,
            //   'altitude': item.live.altitude,
            //   'direction': item.live.direction,
            //   'speed_horizontal': item.live.speed_horizontal,
            //   'speed_vertical': item.live.speed_vertical,
            //   'is_ground': item.live.is_ground
            // }
          }
        })
        resolve(payload)
      })
      .catch(err => reject(err))
  })
}

function initAviation (credentials) {
  return credentials.access_key
}

const needle = require('needle')

const API_URL = 'http://developers.facebook.com/v1'

exports.fetchStoreInfo = (credentials) => {
  const params = initShops(credentials)
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

exports.fetchAllProductCategories = (name, credentials) => {
  const params = initShops(credentials)
  return new Promise(function (resolve, reject) {
    needle('get', `${API_URL}/cities?access_key=${params}&search=${name}`)
      .then(result => {
        result = result.body
        let payload = result.data
        payload = payload.map(item => {
          return {
            categoryName: item.name,
            categoryId: item.id
          }
        })
        resolve(payload)
      })
      .catch(err => reject(err))
  })
}

exports.fetchProductsInThisCategory = (category, credentials) => {
  const params = initShops(credentials)
  return new Promise(function (resolve, reject) {
    needle('get', `${API_URL}/${category}?access_key=${params}&search`)
      .then(result => {
        result = result.body
        let payload = result.data
        payload = payload.map(item => {
          return {
            id: item.id,
            brand: item.brand,
            category: item.category,
            condition: item.condition,
            currency: item.currency,
            description: item.description,
            gender: item.gender,
            image: item.image_url,
            name: item.name,
            inventory: item.inventory
          }
        })
        resolve(payload)
      })
      .catch(err => reject(err))
  })
}

exports.fetchProducts = (query, credentials) => {
  const params = initShops(credentials)
  return new Promise(function (resolve, reject) {
    needle('get', `${API_URL}/${query}/products?access_key=${params}&${query}`)
      .then(result => {
        result = result.body
        let payload = result.data
        payload = payload.map(item => {
          return {
            id: item.id,
            brand: item.brand,
            category: item.category,
            condition: item.condition,
            currency: item.currency,
            description: item.description,
            gender: item.gender,
            image: item.image_url,
            name: item.name,
            inventory: item.inventory
          }
        })
        resolve(payload)
      })
      .catch(err => reject(err))
  })
}

exports.searchProducts = (flightNumber, credentials) => {
  const params = initShops(credentials)
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

function initShops (credentials) {
  return credentials.access_key
}

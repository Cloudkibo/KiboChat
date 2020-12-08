const needle = require('needle')
const Amadeus = require('amadeus')
const util = require('./util')

exports.fetchAirlines = (credentials) => {
  const airlines = [{
    'airline_name': 'Emirates Airlines',
    'iata_code': 'EK',
    'icao_code': 'UAE'
  },
  {
    'airline_name': 'Qatar Airways',
    'iata_code': 'QR',
    'icao_code': 'QTR'
  },
  {
    'airline_name': 'United Airlines',
    'iata_code': 'UA',
    'icao_code': 'UAL'
  },
  {
    'airline_name': 'American Airlines',
    'iata_code': 'AA',
    'icao_code': 'AAL'
  },
  {
    'airline_name': 'Delta Air Lines',
    'iata_code': 'DL',
    'icao_code': 'DAL'
  }]
  return new Promise(function (resolve, reject) {
    resolve(airlines)
  })
}

exports.fetchCityInfo = (name, credentials) => {
  const amadeus = initAmadeus(credentials)
  return new Promise(function (resolve, reject) {
    amadeus.referenceData.locations.get({
      keyword: name,
      subType: Amadeus.location.city
    })
      .then(result => {
        let payload = result.data
        payload = payload.map(item => {
          return {
            'city_name': item.address.cityName,
            'iata_code': item.iataCode,
            'country_iso2': item.country_iso2,
            'latitude': item.geoCode.latitude,
            'longitude': item.geoCode.longitude,
            'timezone': item.timeZoneOffset,
            'gmt': item.gmt,
            'geoname_id': item.geoname_id
          }
        })
        resolve(payload)
      })
      .catch(err => {
        reject(err)
      })
  })
}

exports.fetchAirportInfo = (name, credentials) => {
  const amadeus = initAmadeus(credentials)
  return new Promise(function (resolve, reject) {
    amadeus.referenceData.locations.get({
      keyword: name,
      subType: Amadeus.location.airport
    })
      .then(result => {
        let payload = result.data
        payload = payload.map(item => {
          return {
            'airport_name': item.name,
            'iata_code': item.iataCode,
            'icao_code': item.id,
            'latitude': item.geoCode.latitude,
            'longitude': item.geoCode.longitude,
            'geoname_id': item.geoname_id,
            'timezone': item.timeZoneOffset,
            'gmt': item.gmt,
            'phone_number': item.phone_number,
            'country_name': item.address.countryName,
            'country_iso2': item.address.countryCode,
            'city_iata_code': item.address.cityCode
          }
        })
        resolve(payload)
      })
      .catch(err => {
        reject(err)
      })
  })
}

exports.fetchFlights = (depIata, arrIata, depTime, airlineCode, flightNumber, credentials) => {
  const amadeus = initAmadeus(credentials)
  depTime = new Date(depTime)
  depTime = `${depTime.getFullYear()}-${(depTime.getMonth() + 1)}-${depTime.getDate()}`
  let queryPayload = {
    originLocationCode: depIata,
    destinationLocationCode: arrIata,
    departureDate: depTime,
    adults: '1'
  }
  if (airlineCode) {
    queryPayload.includedAirlineCodes = airlineCode
  }
  return new Promise(function (resolve, reject) {
    amadeus.shopping.flightOffersSearch.get(queryPayload)
      .then(result => {
        let payload = result.data
        console.log('fetch flights payload', JSON.stringify(payload))
        payload = payload.map(item => {
          const airlineCode = item.itineraries[0].segments[0].carrierCode
          let airline = util.findAirlineInfo(airlineCode)[0]
          return {
            'flight_date': item.itineraries[0].segments[0].departure.at,
            'flight_status': '',
            'departure': {
              'airport': item.itineraries[0].segments[0].departure.airport,
              'timezone': item.itineraries[0].segments[0].departure.timezone,
              'iata': item.itineraries[0].segments[0].departure.iataCode,
              'scheduled': item.itineraries[0].segments[0].departure.at
            },
            'arrival': {
              'airport': item.itineraries[0].segments[0].arrival.airport,
              'timezone': item.itineraries[0].segments[0].arrival.timezone,
              'iata': item.itineraries[0].segments[0].arrival.iataCode,
              'scheduled': item.itineraries[0].segments[0].arrival.at
            },
            'airline': {
              'name': airline ? airline.Airline : '',
              'iata': airline ? airline.IATA : '',
              'icao': airline ? airline.ICAO : ''
            },
            'flight': {
              'number': item.itineraries[0].segments[0].number,
              'iata': item.itineraries[0].segments[0].number
            },
            'price': {
              'currency': item.price.currency,
              'amount': item.price.grandTotal
            }
          }
        })
        if (flightNumber) {
          payload = payload.filter(item => item.flight.number === flightNumber)
          payload = [payload[0]]
        }
        payload = payload.filter(item => item.airline.name)
        resolve(payload)
      })
      .catch(err => {
        reject(err)
      })
  })
}

function initAmadeus (credentials) {
  const amadeus = new Amadeus({
    clientId: credentials.clientId,
    clientSecret: credentials.clientSecret,
    hostname: 'test'
  })
  return amadeus
}

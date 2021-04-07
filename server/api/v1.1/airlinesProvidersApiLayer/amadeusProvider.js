const Amadeus = require('amadeus')
const CityTimeZones = require('city-timezones')
const util = require('./util')
const { padWithZeros } = require('./../../../components/utility')

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
        reject(JSON.parse(err.response.body))
      })
  })
}

exports.fetchAirportInfo = (name, credentials) => {
  const amadeus = initAmadeus(credentials)
  return new Promise(function (resolve, reject) {
    amadeus.referenceData.locations.get({
      keyword: name,
      subType: Amadeus.location.any
    })
      .then(result => {
        let payload = result.data
        payload = payload.filter(item => item.subType === 'AIRPORT')
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
        reject(JSON.parse(err.response.body))
      })
  })
}

exports.fetchFlights = (depIata, arrIata, depTime, airlineCode, flightNumber, credentials) => {
  const amadeus = initAmadeus(credentials)
  depTime = new Date(depTime)
  depTime = `${depTime.getFullYear()}-${padWithZeros((depTime.getMonth() + 1), 2)}-${padWithZeros(depTime.getDate(), 2)}`
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
        payload = payload.map(item => {
          const airlineCode = item.itineraries[0].segments[0].carrierCode
          let airline = util.findAirlineInfo(airlineCode)[0]
          const airports = item.itineraries[0].segments.map(segment => {
            const departureAirport = util.findAirportInfoByCode(segment.departure.iataCode)
            const arrivalAirport = util.findAirportInfoByCode(segment.arrival.iataCode)
            let departureAirportTimeZone
            let arrivalAirportTimeZone
            if (departureAirport) {
              departureAirportTimeZone = CityTimeZones.findFromCityStateProvince(departureAirport['Location served'].split(',')[1])
              if (departureAirportTimeZone[0]) {
                departureAirportTimeZone = departureAirportTimeZone[0].timezone
              } else {
                departureAirportTimeZone = undefined
              }
            }
            if (arrivalAirport) {
              arrivalAirportTimeZone = CityTimeZones.findFromCityStateProvince(arrivalAirport['Location served'].split(',')[1])
              if (arrivalAirportTimeZone[0]) {
                arrivalAirportTimeZone = arrivalAirportTimeZone[0].timezone
              } else {
                arrivalAirportTimeZone = undefined
              }
            }
            return {
              'flight_number': segment.number,
              'departure': {
                'airport': departureAirport,
                'timezone': departureAirportTimeZone,
                'iata': segment.departure.iataCode,
                'scheduled': segment.departure.at
              },
              'arrival': {
                'airport': arrivalAirport,
                'timezone': arrivalAirportTimeZone,
                'iata': segment.arrival.iataCode,
                'scheduled': segment.arrival.at
              }
            }
          })
          return {
            'flight_date': item.itineraries[0].segments[0].departure.at,
            'flight_status': '',
            'airports': airports,
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
        }
        payload = payload.filter(item => item.airline && item.airline.name)
        payload = payload.slice().sort((item1, item2) => {
          return new Date(item1.flight_date) - new Date(item2.flight_date)
        })
        payload = payload.slice().sort((item1, item2) => item1.airports.length - item2.airports.length)
        resolve(payload)
      })
      .catch(err => {
        if (err.response.statusCode === 400) {
          const errorBody = JSON.parse(err.response.body)
          let errorMessage = ''
          for (let i = 0; i < errorBody.errors.length; i++) {
            if (errorBody.errors[i].detail === 'Date/Time is in the past') {
              errorMessage = 'Date/Time is in the past'
              break
            }
          }
          if (errorMessage) {
            resolve([])
          } else {
            reject(errorBody.errors)
          }
        } else {
          reject(JSON.parse(err.response.body))
        }
      })
  })
}

exports.fetchFlightByNumber = (flightNumber, airlineCode, depTime, credentials) => {
  const amadeus = initAmadeus(credentials)
  depTime = new Date(depTime)
  depTime = `${depTime.getFullYear()}-${padWithZeros((depTime.getMonth() + 1))}-${padWithZeros(depTime.getDate(), 2)}`
  let queryPayload = {
    carrierCode: airlineCode,
    flightNumber: flightNumber,
    scheduledDepartureDate: depTime
  }
  return new Promise(function (resolve, reject) {
    amadeus.schedule.flights.get(queryPayload)
      .then(result => {
        let payload = result.data
        resolve(payload)
      })
      .catch(err => {
        reject(JSON.parse(err.response.body))
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

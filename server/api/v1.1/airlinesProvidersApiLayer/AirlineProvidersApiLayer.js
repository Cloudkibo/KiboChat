const providers = require('./constants.js')
const aviationProvider = require('./aviationProvider.js')
const amadeusProvider = require('./amadeusProvider.js')
const util = require('./util')

module.exports = class AirlineProvidersApiLayer {
  constructor (airlineProvider, airlineProviderCredentials) {
    this.verifyParams(airlineProvider, airlineProviderCredentials)
    this.airlineProvider = airlineProvider
    this.airlineProviderCredentials = airlineProviderCredentials
  }

  verifyParams (provider, credentials) {
    if (!provider || (typeof provider !== 'string')) throw new Error('First parameter "provider" is must')
    if (provider === providers.aviation) {
      if (credentials && credentials.hasOwnProperty('access_key')) {
        return true
      } else {
        throw new Error('Aviation API credentials require "access_key"')
      }
    } else if (provider === providers.amadeus) {
      if (
        credentials &&
        credentials.hasOwnProperty('clientId') &&
        credentials.hasOwnProperty('clientSecret')
      ) {
        return true
      } else {
        throw new Error('Amadeus credentials require "clientId" and "clientSecret" parameters')
      }
    }
  }

  fetchAirlines () {
    if (this.airlineProvider === providers.aviation) {
      return aviationProvider.fetchAirlines(this.airlineProviderCredentials)
    } else if (this.airlineProvider === providers.amadeus) {
      return amadeusProvider.fetchAirlines(this.airlineProviderCredentials)
    }
  }

  fetchCityInfo (cityName) {
    if (this.airlineProvider === providers.aviation) {
      return util.findCityInfo(cityName)[0]
      // will use the following line when we have paid plan on aviation api
      // return aviationProvider.fetchCityInfo(cityName, this.airlineProviderCredentials)
    } else if (this.airlineProvider === providers.amadeus) {
      return amadeusProvider.fetchCityInfo(cityName, this.airlineProviderCredentials)
    }
  }

  fetchAirportInfo (airportName) {
    if (this.airlineProvider === providers.aviation) {
      return util.findAirportInfo(airportName)[0]
      // will use the following line when we have paid plan on aviation api
      // return aviationProvider.fetchAirportInfo(airportName, this.airlineProviderCredentials)
    } else if (this.airlineProvider === providers.amadeus) {
      return amadeusProvider.fetchAirportInfo(airportName, this.airlineProviderCredentials)
    }
  }

  fetchFlights (depCity, arrCity, depTime, airlineName, flightNumber) {
    if (this.airlineProvider === providers.aviation) {
      return aviationProvider.fetchFlights(depCity, arrCity, depTime, airlineName, this.airlineProviderCredentials)
    } else if (this.airlineProvider === providers.amadeus) {
      return amadeusProvider.fetchFlights(depCity, arrCity, depTime, airlineName, flightNumber, this.airlineProviderCredentials)
    }
  }

  fetchFlightByNumber (flightNumber, airlineCode, depTime) {
    if (this.airlineProvider === providers.aviation) {
      return aviationProvider.fetchFlightByNumber(flightNumber, this.airlineProviderCredentials)
    } else if (this.airlineProvider === providers.amadeus) {
      return amadeusProvider.fetchFlightByNumber(flightNumber, airlineCode, depTime, this.airlineProviderCredentials)
    }
  }
}

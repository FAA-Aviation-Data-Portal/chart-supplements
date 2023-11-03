/* global describe, it */

const assert = require('assert')
const { array, date, object, string } = require('superstruct')
const chartSupplements = require('./index')

const Result = object({
  ident: string(),
  city: string(),
  state: string(),
  airport: string(),
  navAid: string(),
  chart: string(),
  volBackPages: object({
    name: string(),
    url: string()
  }),
  airportNavAidListing: ({
    name: string(),
    url: string()
  }),
  effectiveStartDate: date(),
  effectiveEndDate: date()
})

const Results = array(Result)

describe('chart supplements', () => {
  it('should fetch chart supplements for a single ICAO', () => {
    return chartSupplements('PANC').then(cs => {
      assert.strictEqual(cs.length, 1)
      assert(cs, Results)
    })
  })

  it('should fetch chart supplements for an array of ICAOs', () => {
    return chartSupplements(['PANC', 'PABV']).then(cs => {
      assert.strictEqual(cs.length, 2)
      cs.map(cs => assert(cs, Results))
    })
  })

  it('should expose the list method', () => {
    return chartSupplements.list('PANC')
  })

  it('should expose the fetchCurrentCycleCode method', () => {
    return chartSupplements.fetchCurrentCycleCode().then(cycle => {
      assert(parseInt(cycle))
    })
  })

  it('should fetch chart supplements for an array of ICAOs using the list method', () => {
    return chartSupplements.list(['PANC', 'PABV']).then(cs => {
      assert.strictEqual(cs.length, 2)
      cs.map(cs => assert(cs, Result))
    })
  })
})

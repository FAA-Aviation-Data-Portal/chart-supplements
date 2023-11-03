const superagent = require('superagent')
const cheerio = require('cheerio')

const BASE_URL = 'https://www.faa.gov/air_traffic/flight_info/aeronav/digital_products/dafd/search/'

// For some reason the server takes forever to respond without this request header
const ACCEPT = 'text/html'

const defaultQueryOptions = {
  getNextCycle: false // `false` do not get the 'Next' cycle, only get the 'Current' cycle; `true` get the 'Next' cycle if available
}

/**
 * Provide a shortcut to the list method
 */
const chartSupplements = module.exports = (icaos, options = defaultQueryOptions) => {
  return chartSupplements.list(icaos, options)
}

/**
 * Main listing method; accepts one or more ICAO codes
 */
chartSupplements.list = (icaos, options = defaultQueryOptions) => {
  if (Array.isArray(icaos)) {
    return Promise.all(icaos.map(icao => listOne(icao, options)))
  }
  return listOne(icaos, options)
}

chartSupplements.currentCycleEffectiveDates = async () => {
  const response = await superagent
    .get(BASE_URL)
    .set('Accept', ACCEPT)
    .timeout({ deadline: 30000 })
    .retry(3)

  const $ = cheerio.load(response.text)
  const currentCycle = $('select#cycle > option:contains(Current)').text()
  return parseEffectiveDates(currentCycle.replace(/(\n|\t)/gm, ''))
}

/**
 * Returns the text and values of the targeted <select/> element
 * @param {string} cycle - The target cycle to retrieve. Valid values are 'Current' or 'Next'
 */
const fetchCycle = async (cycle = 'Current') => {
  // Only all the values 'Current' or 'Next'
  if (cycle !== 'Current' && cycle !== 'Next') {
    cycle = 'Current'
  }
  const response = await superagent
    .get(BASE_URL)
    .set('Accept', ACCEPT)
    .timeout({ deadline: 30000 })
    .retry(3)

  const $ = cheerio.load(response.text)
  const $cycle = $(`select#cycle > option:contains(${cycle})`)
  if (!$cycle) {
    return $cycle
  }
  return {
    text: $cycle.text(),
    val: $cycle.val()
  }
}

chartSupplements.fetchCycle = fetchCycle

chartSupplements.getCycleEffectiveDates = async (cycle = 'Current') => {
  const { text: currentCycle } = await fetchCycle(cycle)
  return parseEffectiveDates(currentCycle.replace(/(\n|\t)/gm, ''))
}

chartSupplements.currentCycleEffectiveDates = async () => {
  const { text: currentCycle } = await fetchCycle()
  if (!currentCycle) {
    console.warn('Could not retrieve current cycle effective dates')
    return
  }
  return parseEffectiveDates(currentCycle.replace(/(\n|\t)/gm, ''))
}

/**
 * Fetch the current diagrams distribution cycle numbers (.e.g, 1813)
 */
const fetchCurrentCycleCode = async () => {
  const cycle = await fetchCycle('Current')
  if (!cycle) {
    console.warn('Current cycle not found or not available.')
    return null
  }
  return cycle.val
}

chartSupplements.fetchCurrentCycleCode = fetchCurrentCycleCode

/**
 * Fetch the current diagrams distribution cycle numbers (.e.g, 1813)
 */
const fetchNextCycleCode = async () => {
  const cycle = await fetchCycle('Next')
  if (!cycle) {
    console.warn('Next cycle not found or not available. The Next cycle is available 19 days before the end of the current cycle.')
    return null
  }
  return cycle.val
}

chartSupplements.fetchNextCycleCode = fetchNextCycleCode

/**
 * Fetch chart supplements for a single ICAO code
 */
const listOne = async (icao, options) => {
  let searchCycle = null

  if (options.getNextCycle === true) {
    searchCycle = await fetchNextCycleCode()
  }

  // If the next cycle is not requested, or it is, but it is not
  // available, default to the current cycle
  if (searchCycle === null) {
    if (options.getNextCycle === true) {
      console.warn('Next cycle not available. Retrieving current cycle instead.')
    }
    searchCycle = await fetchCurrentCycleCode()
  }

  // Build up a base set of query params
  const urlParams = [`ident=${icao}`]
  // The searchCycle is optional as the API assumes the latest already
  // and this function uses the latest cycle
  if (searchCycle) {
    urlParams.push(`cycle=${searchCycle}`)
  }

  const res = await superagent
    .get(`${BASE_URL}results/?cycle=${searchCycle}&ident=${icao}&navaid=`)
    .set('Accept', ACCEPT)
    .timeout({ deadline: 30000 })
    .retry(3)
  return await parse(res.text, options.getNextCycle)
}

/**
 * Parsing helper methods
 */
const text = ($row, columnIndex) =>
  $row
    .find(`td:nth-child(${columnIndex})`)
    .text()
    .trim()

const link = ($row, columnIndex) =>
  $row
    .find(`td:nth-child(${columnIndex})`)
    .find('a')
    .attr('href')

/**
 * Extract the relevant information from the dom node and return
 * an object with the data mapped by the appropriate named key
 * @param {HTMLNode} $row - The dom node that contains the tabular data
 */
const extractRow = ($row) => {
  const type = text($row, 7)

  if (!type) {
    return null
  }

  return {
    ident: text($row, 1),
    city: text($row, 2),
    state: text($row, 3),
    airport: text($row, 4),
    navAid: text($row, 5),
    chart: text($row, 6),
    volBackPages: {
      name: text($row, 7),
      url: link($row, 7)
    },
    airportNavAidListing: {
      name: text($row, 8),
      url: link($row, 8)
    }
  }
}

/**
 * Parse the documents out of the response HTML
 */
const parse = async (html, isNextCycle) => {
  const $ = cheerio.load(html)
  const $resultsTable = $('#resultsTable')
  const noResultsFound = $('.message-box.info').text().trim()

  if (!!noResultsFound && noResultsFound === 'No results found.') {
    console.warn(noResultsFound)
    return null
  } else if (!$resultsTable.html()) {
    console.error('Unable to parse the #resultsTable page element')
    return null
  }

  const { effectiveStartDate, effectiveEndDate } = await chartSupplements.getCycleEffectiveDates(isNextCycle ? 'Next' : 'Current')

  const results = $resultsTable
    .find('tr')
    .toArray()
    .map(row => {
      const chart = extractRow($(row))
      if (!chart) {
        return chart
      }
      return {
        ...chart,
        effectiveStartDate,
        effectiveEndDate
      }
    })
    .filter(x => !!x)

  return results
}

const parseEffectiveDates = str => {
  if (!str) {
    return null
  }
  const [startMonthDay, remainder] = str.split('-')
  const [endMonthDay, yearAndCycle] = remainder.split(',')
  const [year] = yearAndCycle.split('[')

  const effectiveStartDate = new Date(`${startMonthDay.trim()} ${year}`)
  effectiveStartDate.setUTCHours(0, 0, 0, 0)

  const effectiveEndDate = new Date(`${endMonthDay.trim()} ${year}`)
  effectiveEndDate.setUTCHours(0, 0, 0, 0)

  return { effectiveStartDate, effectiveEndDate }
}

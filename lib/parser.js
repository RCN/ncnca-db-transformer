import urlUtil from 'url'
import S from 'string'

const getType = (rawType) => {
  const EventTypeMap = {
    'CYCLOCROSS': 'Cyclocross',
    'MTB': 'MTB',
    'TRACK': 'Track',
    'CLINICS': 'Clinics',
    'NCNCA MEETING': 'NCNCA Meeting',
    'NON-COMPETITIVE': 'Non-competitive',
    'ROAD - Circuit - Circuit Race' : 'Circuit Race',
    'ROAD - HC - Hill Climb': 'Hill Climb',
    'ROAD - TT - Time Trial': 'Time Trial',
    'ROAD - RR - Road Race': 'Road Race',
    'ROAD - Crit - Criterium': 'Criterium',
  }

  const eventType = EventTypeMap[rawType]

  if (!eventType) {
    throw new Error(`Can't find matching Event Type for: "${rawType}"`)
  }

  return eventType
}

const getDiscipline = (rawType) => {
  const EventTypeToDisciplineMap = {
    'CYCLOCROSS': 'Cyclocross',
    'MTB': 'MTB',
    'TRACK': 'Track',
    'NCNCA MEETING': '',
    'NON-COMPETITIVE': '',
    'CLINICS': 'Road',
    'ROAD - Circuit - Circuit Race' : 'Road',
    'ROAD - HC - Hill Climb': 'Road',
    'ROAD - TT - Time Trial': 'Road',
    'ROAD - RR - Road Race': 'Road',
    'ROAD - Crit - Criterium': 'Road',
  }

  const eventType = EventTypeToDisciplineMap[rawType]

  if (!eventType && eventType !== '') {
    throw new Error(`Can't find matching Event Discipline for: "${rawType}"`)
  }

  return eventType
}

const trim = str => (str ? str.trim() : '')

const getZip = rawZip => {
  const zipRegex = /^\d{5}(?:[-\s]\d{4})?$/
  let zip = trim(rawZip).match(zipRegex)
  return zip ? zip[0] : ''
}

const getLocation = (rawName, rawStreet, rawCity, rawState, rawZip, rawLat, rawLong) => {
  return {
    name: trim(rawName),
    streetAddress: trim(rawStreet),
    city: trim(rawCity),
    state: trim(rawState),
    zip: getZip(rawZip),
    lat: rawLat,
    long: rawLong,
  }
}

//gets permit id from results url
const getUsacPermit = (rawPermit, resultsUrlRaw, flyerNameRaw) => {
  const resultsUrl = trim(resultsUrlRaw)
  const flyerName = trim(flyerNameRaw)

  const permitInResultsUrlRegex = /\?year=(\d\d\d\d)\&id=(\d+)/
  const permitInNewResultsUrlRegex = /\?permit=(\d\d\d\d-\d+)/
  const permitInFlyerNameRegex = /(\d\d\d\d[- ]\d\d?\d?\d?\d?)/

  let extractedPermit = ''

  if (resultsUrl.match(permitInResultsUrlRegex)) {
    const matches = resultsUrl.match(permitInResultsUrlRegex)
    extractedPermit = `${matches[1]}-${matches[2]}`
  } else if (resultsUrl.match(permitInNewResultsUrlRegex)) {
    const matches = resultsUrl.match(permitInNewResultsUrlRegex)
    extractedPermit = matches[1]
  } else if (flyerName.match(permitInFlyerNameRegex)) {
    const matches = flyerName.match(permitInFlyerNameRegex)
    extractedPermit = matches[1]
  }

  if (extractedPermit) {
    return extractedPermit
  } else {
    const permitRegex = /^(\d\d\d\d-\d+)$/
    let permit = trim(rawPermit).match(permitRegex)
    return permit ? permit[0] : ''
  }
}

const normalizeUrl = (originalUrl, {useHttps = false, useWww = false} = {}) => {
  let origUrl = originalUrl

  if (!origUrl) {
    return ''
  }

  //if it is malformed url try to fix it
  if (!origUrl.startsWith('http')) {
    if (origUrl.startsWith('www')) {
      origUrl = useHttps
        ? 'https:' + origUrl
        : 'http:' + origUrl
    } else {
      //it's probably not an url
      return origUrl
    }
  }

  const parsedUrl = urlUtil.parse(origUrl)
  let host = parsedUrl.host
  let protocol = parsedUrl.protocol
  let path = parsedUrl.path || ''
  let hash = parsedUrl.hash || ''

  let normalizedUrl

  if (useHttps) {
    protocol = 'https:'
  }

  if (useWww
   && (!host.startsWith('www.') && !host.startsWith('www2.') && !host.startsWith('www3.'))
  ) {
     host = 'www.' + host
  }

  return `${protocol}//${host}${path}${hash}`
}

const getResultsUrl = urlRaw => {
    let origUrl = trim(urlRaw)

    if (!origUrl) {
      return urlRaw
    }

    let regUrl = origUrl

    if (origUrl.includes('usacycling.org')) {
      regUrl = normalizeUrl(origUrl, {useHttps:  true, useWww: true})
    }

    return regUrl
}

const getFlyerUrl = flyerRelativePathRaw => {
  let flyerRelativePath = trim(flyerRelativePathRaw)

  if (!flyerRelativePath) {
    return ''
  }

  let absolutePathRoot = 'http://www.ncnca.org/'
  return absolutePathRoot + encodeURI(flyerRelativePath)
}

const getRegUrl = regUrlRaw => {
  let regUrl = trim(regUrlRaw)

  return normalizeUrl(regUrl)
}

const canceledEventRegex = /[\d]?([ -]*\(?cancell?ed\)?[ -]*)/i

const getName = nameRaw => {
  let name = trim(nameRaw)

  name = trim(name.replace(canceledEventRegex, ' ')) //remove cancel

  name = name
    .replace('  ', ' ')
    .replace('- ', ' — ')
    .replace(' -', ' - ')

  name = S(name).collapseWhitespace()

  return name
}

const getStatus = eventNameRaw => {
  let eventName = trim(eventNameRaw)

  if (!eventName) {
    return ''
  }

  const matches = eventName.match(canceledEventRegex)

  let status = ''

  if (matches) {
    status = 'Canceled'
  }

  return status
}

export {
  trim,
  getType,
  getDiscipline,
  getLocation,
  getUsacPermit,
  getResultsUrl,
  getFlyerUrl,
  getRegUrl,
  getName,
  getStatus,
}

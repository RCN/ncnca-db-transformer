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

export {
  trim,
  getType,
  getDiscipline,
  getLocation
}

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


export {
  getType,
  getDiscipline
}

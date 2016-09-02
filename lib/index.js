/* todo:
  - auto-match cancelled events
  - extract permit number from results url if no permit fallback to permit field
  - figure out how to deal with events like Sea Otter (multi-day, multi-type)
  - check if clinics discipline always maches road
  - normalize usacycing results urls
  - manually process missing data
    - adresses
    - names
  - board meetings
*/


import mysql from 'promise-mysql'
import _ from 'lodash'
import moment from 'moment'
import utils from 'util'
import * as parser from './parser'

let pool = mysql.createPool({
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'ncnca_aug29',
  connectionLimit: 10
})

pool.query(`
  select
    n.nid
    , evnt.event_start as startDate
    , td.name as eventType
    , n.title as name
    , l.name as locationName
    , l.street as locationStreet
    , l.additional as locationAdditional
    , l.city as locationCity
    , l.province as locationState
    , l.postal_code as locationZip
    , l.latitude as locationLatitude
    , l.longitude as locationLongitude
    , pi.field_permitnumber_value as permitNumber #can't trust this number
    , pi.field_promoterinfo_value as promoterInfo
    , pi.field_raceresults_url as resultsUrl
    , f.filename as flyerName
    , f.filepath as flyerRelativePath
    , f.filemime as flyerMimeType
    , cfw.field_weblink_url as registrationUrl
    , from_unixtime(n.created) as createdAt
  from node n
    join event evnt on evnt.nid = n.nid
    # types
    left join term_node tn on tn.nid = n.nid
    left join term_data td on td.tid = tn.tid
    # location
    left join location_instance li on li.nid = n.nid
    left join location l on l.lid = li.lid
    # promoter info
    left join content_type_event pi on pi.nid = n.nid
    # flyer
    left join content_field_relevantfiles cfr on cfr.nid = n.nid
    left join files f on f.fid = cfr.field_relevantfiles_fid
    # weblink (reg link?)
    left join content_field_weblink cfw on cfw.nid = n.nid
  where n.type = 'event'
    and td.tid NOT IN (1) #filter "ROAD" event type out since its a grouping type
  order by createdAt asc;`
)
.then(rows => {
  const eventsRaw = rows
    .filter(event => !event.name.toLowerCase().includes('board meeting'))
  // const canceledEvents = eventsRaw
  //   .filter(event => event.name.toLowerCase().includes('cancelled') || event.name.toLowerCase().includes('canceled'))
  const toSimpleEvent = event => ({
    // ...event,
    _year: moment(event.startDate).year(), //TODO bc: remove it

    name: parser.getName(event.name),
    _origName: event.name,
    status: parser.getStatus(event.name),
    type: parser.getType(event.eventType),
    discipline: parser.getDiscipline(event.eventType),
    date: moment(event.startDate).format('MMMM DD YYYY'),
    location: parser.getLocation(
      event.locationName,
      event.locationStreet,
      event.locationCity,
      event.locationState,
      event.locationZip,
      event.locationLatitude,
      event.locationLongitude,
    ),
    usacPermit: parser.getUsacPermit(event.permitNumber, event.resultsUrl, event.flyerName),
    resultsUrl: parser.getResultsUrl(event.resultsUrl),
    promoter: {
      info: event.promoterInfo
    },
    // flyerName: event.flyerRelativePath + event.flyerName
    flyerName: event.flyerName,
    flyerUrl: parser.getFlyerUrl(event.flyerRelativePath), //relative path includes name
    registrationUrl: parser.getRegUrl(event.registrationUrl)
  })
  const events = eventsRaw.map(toSimpleEvent)
  const groupedEvents = _.groupBy(events, '_year')

  const eventsForPrint = Object.keys(groupedEvents).map(year => {
    // if (year !== '2016') return null

    return {
      // [year]: ((groupedEvents[year].map(x => `${x.status}`))).length,
      [year]: ((groupedEvents[year]
        // .filter(x => x.status === 'Canceled')
      )).length,
      x: _.uniq(groupedEvents[year]

        // .map(x => x.name)),
        .map(x => `${x.status}:${x.name}`)),
      // [year]: _.uniq(groupedEvents[year].map(x => `${x.location.name}`))
      // [year]: groupedEvents[year]
    }
  })
  // console.info(groupedEvents)
  console.log(utils.inspect(eventsForPrint, { depth: 4, colors: true, maxArrayLength: 300}))
})
// .catch(err => console.log(err))

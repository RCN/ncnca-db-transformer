/* todo:
  - auto-match cancelled events
  - extract permit number from results url if no permit fallback to permit field
  - figure out how to deal with events like Sea Otter (multi-day, multi-type)
*/


import mysql from 'promise-mysql'
import _ from 'lodash'
import moment from 'moment'
import utils from 'util'

let pool = mysql.createPool({
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'ncnca',
  connectionLimit: 10
})

const CanceledEventRegex = /[\w\d]?([ -]*\(?cancell?ed\)?[ -]*)/

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
  const plannedEvents = rows
    .filter(event => !event.name.toLowerCase().includes('board meeting'))

  const canceledEvents = plannedEvents
    .filter(event => event.name.toLowerCase().includes('cancelled') || event.name.toLowerCase().includes('canceled'))


  const toSimpleEvent = event => ({
    // ...event,
    name: event.name,
    date: moment(event.startDate).format('MM-DD-YYYY'),
    dateAndName: moment(event.startDate).format('MM-DD-YYYY') + ': ' +  event.name,
    year: moment(event.startDate).year()
  })

  const plannedEvensSimple = plannedEvents.map(toSimpleEvent)
  const canceledEventsSimple = canceledEvents.map(toSimpleEvent)

  const groupedEvents = _.groupBy(plannedEvensSimple, 'year')
  const groupedCanceledEvents = _.groupBy(canceledEventsSimple, 'year')
  console.info(groupedCanceledEvents)


  //log grouped by year
  console.log(Object.keys(groupedEvents).map(year => {
    const totalEvents = (_.uniq(groupedEvents[year].map(x => x.dateAndName)).length)
    const totalCanceled = groupedCanceledEvents[year]
      ? (_.uniq(groupedCanceledEvents[year].map(x => x.dateAndName)).length)
      : 0

    return {
      // [year]: groupedEvents[year].map(x => x.dateAndName)
      // [year]: groupedEvents[year].map(x => x.dateAndName).length
      // [year]: _.uniq(groupedEvents[year].map(x => x.dateAndName)).length
      [year]: totalCanceled / totalEvents,
      totalEvents: totalEvents,
      totalCanceled: totalCanceled
    }
  }))


})
// .catch(err => console.log(err))

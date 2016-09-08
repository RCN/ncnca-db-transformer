/* todo:
  - figure out how to deal with events like Sea Otter (multi-day, multi-type)
  + check if clinics discipline always matches road
  + manually process missing data
    + adresses
    + names
  + board meetings
  + multiple promoters for one events
   - how to store this? separate export for promoters?

   + name is messed up
*/


import mysql from 'promise-mysql'
import _ from 'lodash'
import moment from 'moment'
import * as parser from './parser'
import Promise from 'bluebird'
import chalk from 'chalk'
import printDiff from './diff'
import { inspect } from './utils-x.js'
import { writeJsonToFile } from './file-utils'


const using = Promise.using

const _emptyObj = Object.freeze({}) //immutable empty object
const _emptyArr = Object.freeze([]) //immutable empty object
const DATE_FORMAT = 'MMMM DD YYYY'


const pool = mysql.createPool({
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'ncnca_aug29',
  connectionLimit: 10
})

//disposer function
const getSqlConnection = () => pool
  .getConnection()
  .disposer(connection => pool.releaseConnection(connection))


const getEvents = conn => conn.query(`
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

const toSimpleEvent = event => ({
  // ...event,
  _id: event.nid,
  // _year: moment(event.startDate).year(), //TODO bc: remove it
  // _origName: event.name,

  id: 'evt-' + event.nid,
  name: parser.getName(event.name),
  status: parser.getStatus(event.name),
  type: parser.getType(event.eventType),
  discipline: parser.getDiscipline(event.eventType),
  date: moment(event.startDate).format(DATE_FORMAT),
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
  promoters: _emptyArr,
  promoterInfo: event.promoterInfo,
  // flyerName: event.flyerRelativePath + event.flyerName
  flyerName: event.flyerName,
  flyerUrl: parser.getFlyerUrl(event.flyerRelativePath), //relative path includes name
  registrationUrl: parser.getRegUrl(event.registrationUrl)
})

//get all promoters
// const getPromoters = conn => conn.query(`
//   select distinct n.* from content_field_promoter c
//     join node n on n.nid = c.field_promoter_nid`
// )

const toSimplePromoter = promoter => ({
  // _id: promoter.nid,
  id: 'prm-' + promoter.nid,
  name: promoter.title,
  //url: ''
})

const getPromotersForEvent = (conn, eventId) => conn.query(`
  select n2.nid, n2.title from node n1
    left join content_field_promoter c on c.nid = n1.nid
    left join node n2 on n2.nid = c.field_promoter_nid
  where n1.type = 'event' and n1.nid = ?`, [eventId]
)

let start


using(getSqlConnection(), conn =>
  Promise.all([getEvents(conn), /*getPromoters(conn)*/])
    .then(([eventsRaw, /*promotersRaw*/]) => {
      console.info('raw events: ' + eventsRaw.length)
      const events = eventsRaw.map(toSimpleEvent)

      start = +new Date()

      return Promise.map(events,
        event => getPromotersForEvent(conn, event._id)
          .then(eventPromotersRaw => {
            if (eventPromotersRaw.length === 0 || !eventPromotersRaw[0].nid > 0) {
              return event
            }

            return {
              ...event,
              promoters: eventPromotersRaw.map(toSimplePromoter)
            }
          }),
        {concurrency: 10}
      )
      // /return getPromotersForEvent(conn, 23690)
    })
    .then(events => {
      console.log(chalk.blue('Done in ' + (+new Date() - start) + 'ms'))

      const groupedEvents = _.groupBy(events, x => moment(x.date, DATE_FORMAT).year())

      const writeToFiles = Object.keys(groupedEvents).map(year => {
        var eventsForCurrYear = groupedEvents[year]
        return writeJsonToFile(`./data/${year}-ncnca-events.js`, eventsForCurrYear)
          .then(file => console.log(`saved to "${file}"`))
      })

      return Promise.all([
        ...writeToFiles,
        writeJsonToFile('./data/all-ncnca-events.js', events)
      ])

        // events
        //   .filter(x => x._origName !== x.name)
        //   .map(x => {
        //     printDiff(x._origName, x.name)
        //     return x
        //   })

        // let stuffToPrint = events.map(x => x)
        // console.log(inspect(stuffToPrint))

    })

    .catch(err => console.error(err))
)


// .then(rows => {
//   const eventsRaw = rows
//     .filter(event => !event.name.toLowerCase().includes('board meeting'))
//   // const canceledEvents = eventsRaw
//   //   .filter(event => event.name.toLowerCase().includes('cancelled') || event.name.toLowerCase().includes('canceled'))
//
//   const events = eventsRaw.map(toSimpleEvent)
//   const groupedEvents = _.groupBy(events, '_year')
//
//   const eventsForPrint = Object.keys(groupedEvents).map(year => {
//     // if (year !== '2016') return null
//
//     return {
//       // [year]: ((groupedEvents[year].map(x => `${x.status}`))).length,
//       [year]: ((groupedEvents[year])).length,
//       x: _.uniq(groupedEvents[year]
//
//         // .fo;ter(x => x.name === 'bls')),
//         .map(x => `${x.status}:${x.name}`)),
//     }
//   })
//   // console.info(groupedEvents)
//   console.log(utils.inspect(eventsForPrint))
// })
// // .catch(err => console.log(err))

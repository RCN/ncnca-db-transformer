/* todo:
  + check if clinics discipline always matches road
  + manually process missing data
    + adresses
    + names
  + board meetings
  + multiple promoters for one events
   + how to store this? separate export for promoters?
   + name is messed up
   + manually hint disciplines for clinics
   + modify event id's for cases when there are multiple evnets on the same day (add abbreviated type to id + date)

   - series!

   - figure out how to deal with events like Sea Otter (multi-day, multi-type)
   - BUG: in 2016 SeaOtter assigned to 14th, all of it :(
    - some events are listed twice (of the same type with same ids) (we need to have a check for this)

  - some events have multiple flyers, query separately!
*/


import mysql from 'promise-mysql'
import _ from 'lodash'
import moment from 'moment'
import * as parser from './parser'
import Promise from 'bluebird'
import chalk from 'chalk'
import printDiff from './diff'
import { inspect } from './utils.js'
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
    , evnt.event_end as endDate
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

    #, f.filename as flyerName
    #, f.filepath as flyerRelativePath
    #, f.filemime as flyerMimeType

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
    # left join content_field_relevantfiles cfr on cfr.nid = n.nid
    # left join files f on f.fid = cfr.field_relevantfiles_fid

    # weblink (reg link?)
    left join content_field_weblink cfw on cfw.nid = n.nid
  where n.type = 'event'
    and td.tid NOT IN (1) #filter "ROAD" event type out since its a grouping type
  order by createdAt asc;`
)

const getEventId = (date, nid, type) => `evt-${date.year()}-${date.format('MMM').toLowerCase()}-${date.format('DD')}-${nid}-${parser.getAbbreviatedType(type)}`
const regenerateId = event => getEventId(moment(event.date, DATE_FORMAT), event._id, event.type)

const mapToNewIds = events => events.map(event => ({...event, id: regenerateId(event)}))

const toSimpleEvent = event => {
  const type = parser.getType(event.eventType, event.name)
  const startDate = moment(event.startDate)

  return {
    // ...event,
    _id: event.nid,
    _startDate: startDate.format(DATE_FORMAT),
    _endDate: moment(event.endDate).format(DATE_FORMAT),
    // _year: moment(event.startDate).year(),
    // _origName: event.name,

    // id: `evt-${startDate.year()}-${event.nid}`,
    id: getEventId(startDate, event.nid, type),
    name: parser.getName(event.name),
    status: parser.getStatus(event.name),
    type: type,
    discipline: parser.getDiscipline(event.eventType, event.name),
    date: startDate.format(DATE_FORMAT),
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
    // flyerName: event.flyerName,
    // flyerUrl: parser.getFlyerUrl(event.flyerRelativePath), //relative path includes name
    registrationUrl: parser.getRegUrl(event.registrationUrl)
  }
}

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

const mapToSimple = events => events.map(x => ({
  id: x.id,
  _id: x._id,
  sDate: x._startDate,
  // eDate: x._endDate,
  date: x.date,
  name: x.name,
  type: x.type,
  disc: x.discipline,
}))

const mapToSimpleAndInspect = _.flow([mapToSimple, inspect])
const addDaysToStrDate = ({strDate, days}) => moment(strDate, DATE_FORMAT).add(days, 'days').format(DATE_FORMAT)

//gets current property of array with the given index or last one if index is higher then length of the array
// const getCurrentOrLastProp = (arr, i, propName) => ((arr.length - 1 > i) ? arr[i][propName] : _.last(events)[propName])


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

      // const writeToFiles = Object.keys(groupedEvents).map(year => {
      //   var eventsForCurrYear = groupedEvents[year]
      //   return writeJsonToFile(`./data/${year}-ncnca-events.js`, eventsForCurrYear)
      //     .then(file => console.log(`saved to "${file}"`))
      // })

      // return Promise.all([
      //   ...writeToFiles,
      //   writeJsonToFile('./data/all-ncnca-events.js', events)
      // ])

        // events
        //   .filter(x => x.name.toLowerCase().includes('meeting'))

        //for further processing grouping events by id, multi-day and multi-type events
        //are represented as separate records
        const groupedByIdEvents = _.groupBy(events, '_id')

        const eventsForPrint = Object.keys(groupedByIdEvents)
        //flattens grouped array, returns array of arrays with new events and modified ids
        //if mutiple events are on the same day
        .map(id => {
          const events = groupedByIdEvents[id]
          const eventTypes = events.map(x => x.type)
          const multiDayEvent = (events[0]._startDate !== events[0]._endDate)
          const startDate = moment(events[0]._startDate, DATE_FORMAT)
          const endDate = moment(events[0]._endDate, DATE_FORMAT)
          const lengthInDays = endDate.diff(startDate, 'days') + 1

          if (events.length === 1) {
            if (lengthInDays === 40) { //hard coding an outlier
              //creating two events (since we don't know exact dates)
              let first = _.cloneDeep(_.first(events))
              let last = _.cloneDeep(_.last(events))
              first.discipline = 'Road'
              last.discipline = 'Road'
              last.date = _.first(events)._endDate
              return [first, last].map(event => ({...event, id: regenerateId(event)})) //regenerate event ids
            } else if (multiDayEvent) { //one row but multiple days
              //create as many events as it is days, same exact ones
              return _.times(lengthInDays)
                .map(i => {
                  let event = _.cloneDeep(_.first(events))
                  // event.date = addDaysToStrDate(moment(event.date, DATE_FORMAT).add(i, 'days').format(DATE_FORMAT)
                  event.date = addDaysToStrDate({strDate: event.date, days: i})
                  return event
                })
                .map(event => ({...event, id: regenerateId(event)})) //regenerate event ids
            } else {
              return events
            }
          }

          if (events.length > 1) {
            if (multiDayEvent) {
              //TODO: create one event per day per type, if more types then days create events for the last day

              if(_.includes(eventTypes, 'Clinics')) { //clinics are custom case :/
                const otherEventDiscipline = events.find(x => x.type !== 'Clinics').discipline
                const event = _.cloneDeep(_.first(events))
                return _.times(lengthInDays)
                  .map(i => ({
                    ..._.cloneDeep(event),
                    type: 'Clinics',
                    discipline: otherEventDiscipline,
                    date: addDaysToStrDate({strDate: event.date, days: i})
                  }))
                  .map(event => ({...event, id: regenerateId(event)})) //regenerate event ids
              } else {
                if (lengthInDays === events.length) { //number of days maches number of evnet rows
                  return _.times(lengthInDays)
                    .map(i => ({
                      ...(_.cloneDeep(events[i])),
                      date: addDaysToStrDate({strDate: events[i].date, days: i})
                    }))
                    .map(event => ({...event, id: regenerateId(event)})) //regenerate event ids
                } else if (lengthInDays > events.length) { //number of days is more than number of evnet rows
                  let arr =  _.times(lengthInDays)
                    .map(i => ({
                      ...((events.length - 1 > i)
                        ? _.cloneDeep(events[i])
                        : _.cloneDeep(_.last(events))
                      ),
                      date: addDaysToStrDate({strDate: events[0].date, days: i}),
                    }))

                  arr = arr.map(event => ({...event, id: regenerateId(event)}))

                  console.info(chalk.magenta(mapToSimpleAndInspect(
                    arr
                  )))

                  console.info('--')

                  return arr
                } else if (lengthInDays < events.length) { //number of days is less than number of evnet rows)
                  return _.times(eventTypes.length)
                    .map(i => ({
                      ...(_.cloneDeep(events[i])),
                      // date: addDaysToStrDate({strDate: events[0].date, days: i}),
                      date: ((lengthInDays > i)
                        ? addDaysToStrDate({strDate: events[0].date, days: i})
                        : addDaysToStrDate({strDate: events[0].date, days: lengthInDays - 1})
                      ),
                    }))
                    .map(event => ({...event, id: regenerateId(event)})) //regenerate event ids
                } else {
                  console.info(chalk.red('ERROR'))
                }
              }
            } else { //multiple event rows and each of them is non-multiday
              //if it's same day event that has just two types Hill Climb and Time Trial
              //create one event that is Hill Climb (more specific type)
              if (_.difference(eventTypes, ['Time Trial', 'Hill Climb']).length === 0 ) {
                const event = _.cloneDeep(events.find(x => x.type === 'Hill Climb'))
                return [event]
              } else if(_.includes(eventTypes, 'Clinics')) {
                //get non clinics row discipline
                const otherEventDiscipline = events.find(x => x.type !== 'Clinics').discipline
                let event = {
                  ...(_.cloneDeep(events.find(x => x.type === 'Clinics'))),
                  discipline: otherEventDiscipline
                }
                return [event]
              } else if(_.includes(eventTypes, 'Non-Competitive')) {
                const otherEventDiscipline = events.find(x => x.type !== 'Non-Competitive').discipline
                let event = {
                  ...(_.cloneDeep(events.find(x => x.type === 'Non-Competitive'))),
                  discipline: otherEventDiscipline
                }

                return [event]
              } else if(_.uniq(eventTypes).length === 1) {
                //all events are just one meeting event or have multiple entries for some other props and therefore join
                //resulted in multiple rows
                return [_.cloneDeep(_.first(events))]
              } else if (id === '23240') { //hardcoding particular event
                return [_.cloneDeep(events.find(x => x.type === 'Road Race'))]
              } else if (id === '23241') { //hardcoding particular event//TODO return one evnet but pick time trial
                return [_.cloneDeep(events.find(x => x.type === 'Time Trial'))]
              } else if (id === '23242') { //hardcoding particular event
                return [_.cloneDeep(events.find(x => x.type === 'Criterium'))]
              } else { //single day events that don't qualify for any of the above categories
                return events
              }
            }
          }

          throw new Error(`This event was not processed, id: ${id}`)
          // return [events[id]
        })
        .reduce((a, b) => a.concat(b))

        console.info(chalk.blue(`Total events after processing: ${eventsForPrint.length}`))

        const groupedById = _.groupBy(eventsForPrint, 'id')

        console.log('Events with same id:')
        console.log(mapToSimpleAndInspect(
          Object.keys(groupedById)
          .filter(id => groupedById[id].length > 1)
          .map((id, i, arr) => {
            return groupedById[id]
          })
          .reduce((a, b) => a.concat(b), [])
        ))

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

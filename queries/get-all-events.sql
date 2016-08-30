events with start time and name
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
#   , n.*
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
#     and td.name not like '%ROAD%'
#   and n.title like '%Cancelled%'
  and td.tid NOT IN (1) #filter "ROAD" event type out since its a grouping type
#   and td.name like 'ROAD%'
#   and n.nid = 23713

#   and title like '%Mariposa County Women''s Stage Race: ITT - VP#11%'
#     and title like '%Sea Otter%'
order by createdAt asc;
  # title: Red Kite Omnium Event #11 - The Bump Circuit Race (Summer)
  # nid: 23713

  # title: Criterium	Red Kite Omnium Event #12 - The 32nd Annual Berkeley Bicycle Club Criterium
  # nid: 23716
  # date:  July 31, 2016

  # title: Mariposa County Women's Stage Race:
  # nid: 23690


#events with start time and name
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
#   and n.title like '%Sea Otter%'
  and td.tid NOT IN (1) #filter "ROAD" event type out since its a grouping type
#   and td.name like 'ROAD%'
#   and n.nid = 23713

#   and title like '%Mariposa County Women''s Stage Race: ITT - VP#11%'
#     and title like '%Sea Otter%'
order by createdAt asc;

  select * from term_node


  select
    n.nid, cfw.*
  from node n
      # flyer
     left join content_field_weblink cfw on cfw.nid = n.nid
  where n.type = 'event' # and tn.nid is NULL






  #and td.tid NOT IN (1) #filter "ROAD" event type out since its a grouping type
  # 6454 event

  #1890 / 2 = 945
  #969

select * from event

          # race type
          select * from term_data td
            join term_node tn on tn.tid = td.tid
            join node on node.nid = tn.nid
#           where tn.nid = 23713
#             and td.tid NOT IN (1)

          select * from term_data

          # location
          select l.* from location_instance li
            join location l on l.lid = li.lid
          #where li.nid = 23713

          #event details like promoter info, reg opens date, results url
          select * from content_type_event
          #where nid = 23713

#event series (will do later, since it requires joins to the same node table, easier to pull one by one + it's
# one to many (1 event to many serieses )
select n.* from content_field_nameofseries c
  join node n on n.nid = c.field_nameofseries_nid
# where c.nid = 23690
order by created desc


# PICK UP IN SEPARATE QUERIES ONE BY ONE
#promoter
    select n.* from content_field_promoter c
      join node n on n.nid = c.field_promoter_nid
    where c.nid = 23713

#promoters
select n1.nid, n1.title, n2.nid, n2.title from node n1
  join content_field_promoter c on c.nid = n1.nid
  join node n2 on n2.nid = c.field_promoter_nid
where n1.type = 'event' and n1.nid = 23690


        select distinct n.nid, n.title as promoterName from content_field_promoter c
          join node n on n.nid = c.field_promoter_nid

        select * from content_field_promoter c

        select * from content_field_weblink cfw
        select * from content_field_link


      #weblink (reglink?)
      select * from content_field_weblink c
#       where c.nid = 23713

      select * from content_field_contactemail c
#       where c.nid = 23713

      #some other link, mb event link?
      select * from content_field_link c
#       where c.nid = 23713

            #flyer
            select files.* from content_field_relevantfiles c
              join files on files.fid = c.field_relevantfiles_fid
      #       where filemime != 'application/pdf'
      #       where c.nid = 23713

select * from node_type
select * from files

select count(*) from node
where type = 'event';

select
  from_unixtime(users.created) as createdAt,
  from_unixtime(users.access) as accessAt,
  from_unixtime(users.login) as loginAt,
  users.*
from users
order by createdAt

select count(*) from users;

select * from term_data td
  join term_node tn on tn.tid = td.tid
  join node on node.nid = tn.nid
where tn.nid = 23713

select * from files

#
# updates
# sponsor
# socialnetworking_link
# series
# page
# ncncayear
# memberclubs
# image
# frontpagebox
# forum
# eventpromoter
# event_master
# event
# blog
# announcements

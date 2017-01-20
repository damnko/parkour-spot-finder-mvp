
var ObjectID = require('mongodb').ObjectID;

var config = require('../config/config');
var spotsColl = config.get('db:spotsCollection');

var log = require('../helpers/log');
var moment = require('moment');

module.exports = (function(){
  function add(db, spotDetails,callback){
    
    // convert images to array
    spotDetails.img = JSON.parse(spotDetails.img);
    // convert tricks to mongo obj
    var tricksArr = spotDetails.tricks.split(',');
    var tricksObj = [];
    tricksArr.forEach(function(trick){
      tricksObj.push(new ObjectID(trick))
    })
    spotDetails.tricks = tricksObj;
    
    db.collection(spotsColl).insert(spotDetails, function(err,result){
      if (err)
        callback(err, null)
      callback(null, result)
    })
    
  }

  function findById(db,id,callback){
    log.debug('findById called with id', id)
    db.collection(spotsColl).aggregate([
      {$match:
        {
          _id: new ObjectID(id)
        }
      },
      // unwind fa in modo che l'array tricks si trasformi in singoli elementi ciascuno con un solo trick, in questo modo posso poi usare il lookup (altrimenti il lookup non funziona su un array)
      {$unwind: "$tricks"},
      {
        $lookup: {
          // collection da cui prende il dato
          from: "tricks", 
          // nome del campo della collection "transactions" in cui trovare il valore da cercare dentro "from"
          localField: "tricks",
          // campo corrispondente dentro a collection "from"
          foreignField: "_id",
          // parametro in cui viene salvata la richiesta
          as: "tricks_lookup"
        }
      },
      // Unwind the result arrays ( likely one or none )
      { "$unwind": "$tricks_lookup" },
      // Group back to arrays
      { $group: {
          "_id": "$_id",
          "name": { $first: "$name" }, // devo fare cosi per recuperare semplicemente il nome e altri dati da un $group
          "description": { $first: "$description" },
          "tricks_lookup": { "$push": "$tricks_lookup.name" }, // recupero solo il nome di ogni trick
          "formatted_address": {$first: "$formatted_address"},
          "img": {$first: "$img"},
          "loc": {$first: "$loc"},
          "rating": { $first: "$rating" }
        }
      }
    ], function(err, spot){
      if (err){
        log.error('error during spot.findById');
        return callback(err, null)
      }
      log.debug('found spot in findById')
      callback(null, spot[0])
    })
  }

  // function to get only the number of spots within a google maps bound and eventually applied filters
  function withinBoundsCount(db, boundsBox, filters, callback){
    
    var search = {
      loc : {
        $geoWithin : {
          // [southwest-lng, southwest-lat],[northeast-lng,northeast-lat]
          $geometry : {
            type: 'Polygon',
            coordinates: boundsBox
          }
        }
      }
    }

    if (filters.datetime != ''){
      search.training = {
        "$elemMatch": {
          "$or": [
            {"from": {
              "$gte": new Date(filters.datetime.from),
              "$lte": new Date(filters.datetime.to)
            }},
            {"to": {
              "$gte": new Date(filters.datetime.from),
              "$lte": new Date(filters.datetime.to)
            }}
          ]
        }
      }
    }
    if (filters.tricks != ''){
      // split tricks in array
      var tricks = filters.tricks.list.split(',');
      var tricksLogic = filters.tricks.logic;
      // refactor tricks array with object IDS
      tricks = tricks.map(function(trick){
        return new ObjectID(trick)
      })
      if (tricksLogic == 'or'){
        search.tricks = {
          "$in": tricks
        }
      }else{
        search.tricks = {
          "$all": tricks
        }
      }
    }
    if (filters.rating != ''){
      search["rating.value"] = {
          "$gte": parseInt(filters.rating)
      }
    }

    db.collection(spotsColl).count(search, function(err, count){
      if (err){
        log.error('error during spot bounds count', err);
        return callback(err, null);
      }
      log.debug('spots count in bounds search', count);
      callback(null, count);
    })
  }

  // function to search in a radius around a geo coords
  function findNearby(db, geo, callback){
    log.debug('called findNearby with', geo)
    db.collection(spotsColl).find({
      // radius of 0.1km (6371km should be earth raius or diameter.. - formula to convert km to radians)
      loc: { $geoWithin: { $centerSphere: [ [ parseFloat(geo.lng), parseFloat(geo.lat) ], 0.1/6371 ] } }
    }).toArray(function(err, res){
      if (err){
        log.debug('error during findNearby', err)
        callback(err, null);
        return;
      }
      log.debug('found spots during findNearby', res)
      callback(null, res)
    })
  }

  // aggregation to get all the spots in a google maps bounds and eventually applied filters
  function withinBounds(db, data, callback){
    // refactor bounds box
    // var northeast = [bounds.east, bounds.north];
    // var southwest = [bounds.west, bounds.south]
    // log.debug('typeof bounds.east', typeof bounds.east);

    log.debug('looking for spots with these parameters:')
    // pretty print of data
    console.log(JSON.stringify(data, null, 2));

    // bounds refactoring from google maps to mongodb bounds
    var bounds = data.location.bounds;
    var boundsBox = [[
      [parseFloat(bounds.east), parseFloat(bounds.north)],
      [parseFloat(bounds.east), parseFloat(bounds.south)],
      [parseFloat(bounds.west), parseFloat(bounds.south)],
      [parseFloat(bounds.west), parseFloat(bounds.north)],
      [parseFloat(bounds.east), parseFloat(bounds.north)]
    ]];

    var match = {
      "$match":
      {
        "loc" : {
          "$geoWithin" : {
            // [southwest-lng, southwest-lat],[northeast-lng,northeast-lat]
            "$geometry" : {
              "type": "Polygon",
              "coordinates": boundsBox
            }
          }
        }
      }
    }

    log.debug('$match composition:')
    console.log(JSON.stringify(match, null, 2));

    var filters = {
      datetime: data.datetime,
      tricks: data.tricks,
      rating: data.rating
    }
    log.debug('filters composition:')
    console.log(JSON.stringify(filters, null, 2));

    if (data.datetime != ''){
      log.debug('ok data trovata')
      // trovo le date che abbiano il campo "from" o "to" compreso tra il range indicato nei filtri
      match.$match.training = {
        "$elemMatch": {
          "$or": [
            {"from": {
              "$gte": new Date(data.datetime.from),
              "$lte": new Date(data.datetime.to)
            }},
            {"to": {
              "$gte": new Date(data.datetime.from),
              "$lte": new Date(data.datetime.to)
            }}
          ]
        }
      }
    }
    log.debug('$match after datetime composition:')
    console.log(JSON.stringify(match, null, 2));

    if (data.tricks != ''){
      // split tricks in array
      var tricks = data.tricks.list.split(',');
      var tricksLogic = data.tricks.logic;
      // refactor tricks array with object IDS
      tricks = tricks.map(function(trick){
        return new ObjectID(trick)
      })
      // se devo cercare gli spot che hanno almeno uno dei tricks indicati
      if (tricksLogic == 'or'){
        match.$match.tricks = {
          "$in": tricks
        }
      }else{
        // qui non posso fare match.$match.tricks = tricks altrimenti trova solo gli spot che hanno solo ed esclusivamente quei tricks ( e nessuno di piu' ) invece a me va bene che ne abbiano anche altri, oltre a quelli richiesti
        // cerco tutti gli spot che abbiano ALMENO tutti i tricks indicati nel filtro
        match.$match.tricks = {
          "$all": tricks
        }
      }
    }

    log.debug('$match after tricks composition:')
    console.log(JSON.stringify(match, null, 2));

    if (data.rating != ''){
      // questo match non funzionava se facevo
      // match.$match.rating = {
      //   value: {
      //     "$gte": parseInt(data.rating)
      //   }
      // }
      // probabilmente perche' si tratta del match di un aggregate
      match.$match["rating.value"] = {
          "$gte": parseInt(data.rating)
      }
    }

    log.debug('$match after rating composition:')
    console.log(JSON.stringify(match, null, 2));

    var page = parseInt(data.page-1);
    var limit = parseInt(data.limit);

    db.collection(spotsColl).aggregate([
      match,
      // unwind fa in modo che l'array tricks si trasformi in singoli elementi ciascuno con un solo trick, in questo modo posso poi usare il lookup (altrimenti il lookup non funziona su un array)
      {$unwind: "$tricks"},
      {
        $lookup: {
          // collection da cui prende il dato
          from: "tricks", 
          // nome del campo della collection "transactions" in cui trovare il valore da cercare dentro "from"
          localField: "tricks",
          // campo corrispondente dentro a collection "from"
          foreignField: "_id",
          // parametro in cui viene salvata la richiesta
          as: "tricks_lookup"
        }
      },
      // Unwind the result arrays ( likely one or none )
      { "$unwind": "$tricks_lookup" },
      // Group back to arrays
      { $group: {
          "_id": "$_id",
          "name": { $first: "$name" }, // devo fare cosi per recuperare semplicemente il nome e altri dati da un $group
          "description": { $first: "$description" },
          "tricks_lookup": { "$push": "$tricks_lookup.name" },
          "formatted_address": {$first: "$formatted_address"},
          "img": {$first: "$img"},
          "loc": {$first: "$loc"}
        }
      },
      {
        $skip: page*limit
      },
      {
        $limit: limit
      }
    ], function(err, spots){
      if (err){
        log.error('error during spot bounds search', err);
        return callback(err, null);
      }

      log.debug('found spots during bounds search', spots);

      // get the total nr of spots within those bounds (because the above $match returns only the number defined by "limit" - i need "count" for the pagination)
      withinBoundsCount(db, boundsBox, filters, function(err, count){
        if (err){
          log.error('error during spot bounds search', err);
          return callback(err, null);
        }
        var res = {
          spots: spots,
          count: count,
          page: page
        }
        callback(null, res);
      })
    })
  }

  // rating functions
  var rating = {
    rate: function (db, data, callback){
      log.debug('spot model data', data);
      var set = {};
      // use variables inside mongodb query
      set["rating.votes." + data.username] = parseInt(data.rating);

      var that = this;

      db.collection(spotsColl).findOneAndUpdate({
        _id: new ObjectID(data.id)
      },{
        $set: set
      },{
        returnOriginal: false
      }, function(err, res){
        if (err){
          log.debug('error while submitting vote', err)
          callback(err, null)
          return
        }
        log.debug('vote saved', data.rating)
        // calculate the mean rating
        var spot = res.value;
        var rating = that.getMean(spot);
        // update the mean in collection
        that.saveMean(db, spot, rating.mean, function(err, res){
          if (err){
            callback(err, null)
            return
          }
          callback(null, res)
        })
      })
    },
    getMean: function(spot){
      var votesNr=0;
      var votesTot=0;
      for (var user in spot.rating.votes){
        var rating = spot.rating.votes[user];
        votesTot += rating;
        votesNr++;
      }

      return {
        votesNr: votesNr,
        mean: Math.round(votesTot/votesNr)
      }
    },
    saveMean: function(db, spot, mean, callback){
      db.collection(spotsColl).update({
        _id: spot._id
      }, {
        $set: {
          "rating.value": mean
        }
      }, function(err, res){
        if (err){
          log.debug('error while saving new rating mean')
          callback(err, null)
          return
        }
        log.debug('saved new rating mean:', mean)
        callback(null, res)
      })
    }
  }
  
  // find spot by spotname - used in typeahead suggestion engine
  function suggest(db, str, callback){
    var reg = new RegExp('.*' + str + '.*', 'i');

    db.collection(spotsColl).find({
      name: {
        $regex: reg
      }
    },{
      _id: 1,
      name: 1,
      formatted_address: 1
    }).toArray(function(err, spots){
      if (err)
        return ['errore']
      // convert object ids to strings
      spots = spots.map(function(el){
        return {
          name: el.name + ', ' + el.formatted_address,
          _id: el._id.toString()
        }
      })
      callback(spots)
    })
  }

  // training handling
  var training = {
    add: function(db, data, callback){
      // create the date obj
      var date = data.datepicker
                  .split('-')
                  .map(function(data){
                    return parseInt(data);
                  })
      // create time obj
      var time = data.timepicker
                  .split(':')
                  .map(function(tempo){
                    return parseInt(tempo)
                  });
      // calculate duration
      var hour = 0,
          min = 0;
      var duration = data.slider.split(' ')
      duration.forEach(function(el){
        if (el.indexOf('h') !== -1)
          hour = parseInt(el)
        else
          min = parseInt(el)
      })
      var endTime = moment([date[0], date[1]-1, date[2], time[0], time[1]])
        .add(hour, 'h')
        .add(min, 'm')
        .format('x'); //unixtime

      db.collection(spotsColl).findOneAndUpdate({
        _id: new ObjectID(data.id)
      }, {
        // add to training array (if not existing)
        $addToSet: {
          training: {
            user: data.username,
            from: new Date(date[0], date[1]-1, date[2], time[0], time[1]),
            to: new Date(parseInt(endTime))
          }
        }
      }, function(err, res){
        if (err){
          callback({
            error: err
          }, null)
          return
        }
        callback(null, {
          success: 'Training date updated successfully'
        })
      })
    },
    // create a daily timetable with the total count of people training on a spot in a specific date
    groupByTime: function(db, date, id, callback){
      // date format sample: 2016-04-14
      var dateArr = date.split('-').map(function(date){ return parseInt(date) });
      var dateFrom = new Date(dateArr[0], dateArr[1] -1, dateArr[2], 0, 0)
      var dateTo = new Date(dateArr[0], dateArr[1] -1, dateArr[2], 23, 59)
      log.debug('dateFrom', dateFrom)
      log.debug('dateTo', dateTo)
      db.collection(spotsColl).aggregate([
        {$match:{
          _id: new ObjectID(id),
          training: {
            // devo cercare tutti i documents che nell'array training abbiano almeno un elemento {from, to} che risponde a:
            $elemMatch: 
            {
              $or: [
                // le due verifiche gte/lte dentro il from/to sono verificate insieme, (come se ci fosse un $and)
                { from: { $gte: dateFrom, $lte: dateTo } },
                { to: { $gte: dateFrom, $lte: dateTo } }
              ]
            }
          }
        }},
        {$unwind: "$training"},
        {$group: {
          "_id": "$training.user",
          "range" : {
            $addToSet: {
              // if $cond is verified then the second argument is inserted in the range array, else false (do not add anything in the range array)
              $cond: [
                {
                  $or: [
                    // nel $group o $project devo usare la forma $gte: [1, 2] e non posso avere insieme $gte e $lte, quindi devo usare il $and per verificarle insieme
                    {$and : [ {$gte: ["$training.from", dateFrom]}, {$lte: ["$training.from", dateTo]} ]},
                    {$and : [ {$gte: ["$training.to", dateFrom]}, {$lte: ["$training.to", dateTo]} ]}
                  ]
                },
                {
                  from: {
                    $cond: [
                      {$and : [ {$gte: ["$training.from", dateFrom]}, {$lte: ["$training.from", dateTo]} ]},
                      "$training.from",
                      dateFrom
                    ]
                  },
                  to: {
                    $cond: [
                      {$and : [ {$gte: ["$training.to", dateFrom]}, {$lte: ["$training.to", dateTo]} ]},
                      "$training.to",
                      dateTo
                    ]
                  }
                },
                false
              ]
            }
          }
        }}
      ], function(err, result){
        if (err){
          log.debug('error occurred while groupbytime', err)
          return
        }
        if (result.length > 0){
          log.debug(new Date(result[0].range[0].from))
        }

        // get 15 mins frame from result
        var timetable = {},
            schedule = {};
        if (result.length > 0){
          result.forEach(function(training){
            training.range.forEach(function(time){
              var slotTime = time.from;
              var endTime = time.to;
              // ciclo a blocchi di 15mins e in ogni blocco di tempo inserisco gli utenti presenti
              while (slotTime <= endTime){
                var currentTime = moment(slotTime).format('HH:mm');
                if (schedule[currentTime]){
                  if (schedule[currentTime].users.indexOf(training._id) === -1){
                    schedule[currentTime].users.push(training._id)
                    schedule[currentTime].count++
                  }
                }else{
                  schedule[currentTime] = {
                    users: [training._id],
                    count: 1
                  }
                }
                // incremento il tempo per il prossimo ciclo
                slotTime = moment(slotTime).add(15, 'm')
              }
            })
          })
          console.log(JSON.stringify(schedule, null, 2));
        }

        // creo array di orari vuoti
        var startTime = moment('2016-01-01').format();
        var endTime = moment('2016-01-02').format();
        while (startTime < endTime){
          var clock = moment(startTime).format('HH:mm')
          timetable[clock] = (schedule[clock]) ? schedule[clock].count : 0;
          startTime = moment(startTime).add(15, 'm').format()
        }
        console.log('array totale');
        console.log(JSON.stringify(timetable, null, 2));

        callback(err, timetable)

        log.debug('res', result)
        console.log(JSON.stringify(result, null, 2));
        // log.debug('res.length()', res.length())
      })

            // // e' diverso scrivere cosi
            // $elemMatch: 
            // {
            //     from: {
            //       $gte: dateFrom,
            //       $lte: dateTo
            //     }
            // }
            // // oppure cosi
            // $elemMatch: 
            // {
            //     from: {$gte: dateFrom},
            //     from: {$lte: dateTo}
            // }
            // // perche' questo secondo (penso) valuti solo la prima occorrenza del "from"

    }
  }

  return {
    add: add,
    withinBounds: withinBounds,
    findById: findById,
    training: training,
    rating: rating,
    suggest: suggest,
    findNearby: findNearby
  }
})()
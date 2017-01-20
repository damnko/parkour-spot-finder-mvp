var express       = require('express');
var router        = express.Router();
var log           = require('../helpers/log'); // logger/winston

var Spot = require('../models/spot');

// current date timetable
router.get('/groupTraining/:id/:date/', function(req, res, next){
  var db = res.locals.db;
  var date = req.params.date;
  var id = req.params.id
  Spot.training.groupByTime(db, date, id, function(err, timetable){
    if (err){
      log.debug('error while spot.training.groupByTime', err)
      res.json({
        error: 'Error while calculating today training schedule'
      })
      return
    }
    res.json({
      success: timetable
    })
  });
})

// /spot/spotID/nomespot/
router.get('/:id/:spotName', function(req, res, next){

  // find spot id
  var id = req.params.id;
  var db = res.locals.db;

  log.debug('looking for spot with id', id);

  Spot.findById(db, id, function(err, spot){
    if (err){
      req.flash('error', 'No spot found with id ' + id);
      return res.redirect('/');
    }

    log.debug('found a spot for id', id, 'with details', spot);

    // refactor img array
    var i = 0;
    var imgs = [];
    spot.img.forEach(function(img){
      var imgDett = {
        name: img.name,
        size: img.size,
        hidden: false
      }
      if (i>0)
        imgDett.hidden = true;
      imgs.push(imgDett);
      i++;
    })

    log.debug('imgs', imgs)

    // get spot rating
    console.log(JSON.stringify(spot, null, 2));
    var rating = false;
    if (spot.rating){
      rating = Spot.rating.getMean(spot);
    }

    // render page
    res.render('spotDett', {
      _id: id,
      title: 'SpotDett',
      section: function(name, options){
        if(!this._sections) this._sections = {};
        this._sections[name] = options.fn(this);
        return null;
      },
      imgs: imgs,
      name: spot.name,
      description: spot.description,
      tricks: spot.tricks_lookup,
      lng: spot.loc.coordinates[0],
      lat: spot.loc.coordinates[1],
      user: req.user,
      rating: rating
    })
  })
})

router.post('/addTrainingTime', function(req, res, next){

  var db = res.locals.db;
  req.body.username = req.user.username;

  log.debug('req.body', req.body)
  log.debug('req.user', req.user)

  Spot.training.add(db, req.body, function(err, success){
    if (err)
      return res.json(err)
    return res.json(success)
  })
})

// spot rating
router.post('/rating', function(req, res, next){
  log.debug('submitting vote', req.body)
  var db = res.locals.db;
  var data = req.body;
  data.username = req.user.username;

  Spot.rating.rate(db, data, function(err, doc){
    if (err){
      res.json({
        error: 'error while submitting vote'
      })
      return
    }
    res.json({
      success: 'vote submitted correctly'
    })
  })
})

module.exports = router
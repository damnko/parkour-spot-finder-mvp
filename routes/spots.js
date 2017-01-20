var express       = require('express');
var router        = express.Router();
var log           = require('../helpers/log'); // logger/winston

router.get(/\/(filter\/(.*))?$/, function(req, res, next){
  res.render('spots', {
    title: 'Spots',
    user: req.user,
    section: function(name, options){
      if(!this._sections) this._sections = {};
      this._sections[name] = options.fn(this);
      return null;
    }
  })
})

var Spot = require('../models/spot');
router.get('/searchBounds', function(req, res, next){
  log.debug('got request for bounds', req.query.location.bounds)

  var db = res.locals.db;
  // search for spots in bounds
  Spot.withinBounds(db, req.query, function(err, spotsData){
    if (err){
      log.error('there was an error during spot bounds search')
      res.json({
        error: "There was an error during spot search"
      })
      // notie here
      return
    }
    log.debug('found sposts after bounds search', spotsData)
    res.json({
      success: spotsData
    })
  })
})

router.get('/suggest/:name.json', function(req, res, next){
  var str = req.params.name.trim();
  var db = res.locals.db;

  Spot.suggest(db, str, function(spots){
    log.debug('spots found', spots)
    res.json(spots)
  })
})

var Trick = require('../models/trick');
router.get('/tricks', function(req, res, next){
  var db = res.locals.db;
  Trick.getAll(db, function(err, tricks){
    if (err){
      log.debug('Error while getting all tricks list', err)
      res.json({
        error: 'Error while getting all tricks list'
      })
      return
    }
    res.json({
      tricks: tricks
    })
  })
})

module.exports = router
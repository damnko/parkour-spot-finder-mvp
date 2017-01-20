var MongoClient = require('mongodb').MongoClient;
var log = require('./log');

// get winston config
var config = require('../config/config')

// Connection URL
var url = config.get('db:url');

var _db = null;
module.exports = {
  init: function(callback){
    MongoClient.connect(url, function(err, db) {
      if (err)
        return log.error('Connection to mongodb failed', err);
      
      log.info('Connected to mongodb');
      _db = db;
      callback();
    })
  },
  db: function(){
    return _db;
  }
}
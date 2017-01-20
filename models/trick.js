
// helpers and configurations
var log = require('../helpers/log');
var config = require('../config/config');

// parameters
var tricksColl = config.get('db:tricksCollection');

var trick = (function(){
  var source = 'tricks';

  function search(db, str, callback){
    var reg = new RegExp('.*' + str + '.*', 'i');

    db.collection(tricksColl).find({
      name: {
        $regex: reg
      }
    },{
      _id: 1,
      name: 1
    }).toArray(function(err, tricks){
      if (err)
        return ['errore']
      // convert object ids to strings
      tricks = tricks.map(function(el){
        return {
          name: el.name,
          _id: el._id.toString()
        }
      })
      callback(tricks)
    })
  }
  // list all the tricks (used to populate the filters in /spots)
  function getAll(db, callback){
    db.collection(tricksColl).find().toArray(function (err, tricks){
      if (err){
        callback (err, null)
        return
      }
      callback(null, tricks)
    })
  }

  return {
    search: search,
    getAll: getAll
  }
})()

module.exports = trick;
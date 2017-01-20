var log = require('./log');

// module to print out error messages to admin and user

module.exports = {
  db: function(res, err, mess){
    log.error('DB Error: Triggered while', mess, err);
    return res.json({
      critical: 'There was an error during the database connection, please try again later'
    })
  },
  generic: function(res, err, mess){
    log.error('Error: Triggered while', mess.admin, err);
    return res.json({
      critical: mess.user
    })
  }
}

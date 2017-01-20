// modules
var bcrypt = require('bcrypt');
var ObjectID = require('mongodb').ObjectID;

// helpers and configurations
var log = require('../helpers/log');
var errHandle = require('../helpers/errors');
var config = require('../config/config');

// parameters
var usersColl = config.get('db:usersCollection');

var User = {
  usernameUnique: function(res, username, callback){
    var db = res.locals.db;
    // getting db with require('../helpers/db').db() won't work..dunno why
    
    db.collection(usersColl).count({
      username: username
    }, function(err, count){
      if (err)
        return errHandle.db(res, err, 'checking if username exist during user registration')

      if (count > 0){
        log.warn('Username', username, 'already exists');
        return res.json({
          errors: {
            registerusername: ['The username already exists, please chose anotherone']
          }
        })
      }

      log.debug('OK - No user registered with the username', username);
      callback();
    })
  },
  emailUnique: function(res, email, callback){
    var db = res.locals.db;
    // getting db with require('../helpers/db').db() won't work..dunno why
    
    db.collection(usersColl).count({
      email: email
    }, function(err, count){
      if (err)
        return errHandle.db(res, err, 'checking if email exist during user registration')

      if (count > 0){
        log.warn('Email', email, 'already exists');
        return res.json({
          errors: {
            registeremail: ['The email already exists, please chose anotherone']
          }
        })
      }

      log.debug('OK - No user registered with the email', email);
      callback();
    })
  },
  register: function(res, details, callback){
    var db = res.locals.db;

    // password encryption
    bcrypt.genSalt(function(err, salt) {
      if (err)
        return errHandle.generic(res, err, {
          admin:'generating salt for password during registration',
          user:'There was a problem during user registration, please try again later'
        })
      bcrypt.hash(details.password, salt, function(err, hash){
        if (err)
          return errHandle.generic(res, err, {
            admin:'generating hash for password during registration',
            user:'There was a problem during user registration, please try again later'
          })

        log.debug('Password encrypted, inserting in DB');
        db.collection(usersColl).insert({
          username: details.username,
          email: details.email,
          password: hash
        }, function(err, doc){
          if (err)
            return errHandle.generic(res, err, {
              admin:'saving a new user in DB during registration',
              user:'There was a problem during user registration, please try again later'
            })
          callback()
        })
      })
    })
  },
  // Passport authentication methods - START
  findOne: function(username, callback){
    var db = require('../helpers/db').db();
    // log.debug('db instance', db);
    db.collection(usersColl).findOne({
      username: username
    }, function(err, user){
      log.debug('err', err);
      log.debug('user', user);
      if (err)
        return callback(err, user);
      callback(null, user);
    })
  },
  validPassword: function(user, password, callback){
    bcrypt.compare(password, user.password, function(err, res) {
      if (err)
        return callback(err, false)
      callback (err, res);
    });
  },
  findById: function(id, callback){
    var db = require('../helpers/db').db();
    db.collection(usersColl).findOne({
      _id: new ObjectID(id)
    }, callback)
  }
  // Passport authentication methods - END
}

module.exports = User;
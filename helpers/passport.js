// modules
var passport = require('passport')
  , LocalStrategy = require('passport-local').Strategy;
// models
var User = require('../models/user');
// helpers
var log = require('./log');

passport.use(new LocalStrategy({
    usernameField: 'usernamelogin',
    passwordField: 'passwordlogin'
  },
  function(username, password, done) {
    log.debug('Started login request');
    User.findOne(username, function(err, user) {
      if (err) {
        log.error('Error during user.findOne during login');
        return done(err);
      }
      if (!user) {
        log.warn('Incorrect username during login');
        return done(null, false, { message: 'Incorrect username.' });
      }
      log.debug('Found user', user, 'during login');
      User.validPassword(user, password, function(err, validPassword){
        if (err){
          log.error('Error during password bcrypt in User.validPassword');
          return done(err);
        }
        if (!validPassword){
          log.warn('Incorrect password during login');
          return done(null, false, { message: 'Incorrect password.' });
        }
        log.info('Password is OK, logging in...');
        return done(null, user);
      })
      
    });
  }
));

passport.serializeUser(function(user, done) {
  log.debug('serializing user', user);
  log.debug('serializing user - done');
  done(null, user._id);
});

// questa e' la funzione che salva lo user dentro a req.user
passport.deserializeUser(function(id, done) {
  User.findById(id, function(err, user) {
    // cambio user prima di salvarlo dentro la session req.user in modo da non far vedere la password (crittata)
    // per evitare che l'id venga salvato nella forma bson type objectID allora faccio _id.toString()
    var storedUser = {
      id: user._id.toString(),
      username: user.username,
      email: user.email
    }
    done(err, storedUser);
  });
});

function login(req, res, next) {
  passport.authenticate('local', function(err, user, info) {
    if (err) {
      return errHandle.generic(res, err, {
        admin:'login or password check',
        user:'There was a problem during login'
      })
      //return next(err);
    }
    if (!user) {
      return res.json({
        critical: info.message
      })
      // return res.redirect('/login');
    }
    req.logIn(user, function(err) {
      if (err) {
        return errHandle.generic(res, err, {
          admin:'req.login request',
          user:'There was a problem during login'
        })
        // return next(err);
      }
      // potrei salvare manualmente lo user nella session facendo cosi (al momento non lo faccio perche' req.user funziona cmq correttamente)
      // req.session.user = {
      //   id: user._id,
      //   username: user.username,
      //   email: user.email
      // }
      return res.json({
        success: {
          dest: '/spots'
        }
      })
      // return res.redirect('/users/' + user.username);
    });
  })(req, res, next);
}

module.exports = login;
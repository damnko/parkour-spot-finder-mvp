var express       = require('express');
var router        = express.Router();
var log           = require('../helpers/log'); // logger/winston
var errHandle        = require('../helpers/errors'); // backend error handling
// passport
var passport      = require('passport')
  , LocalStrategy = require('passport-local').Strategy;

// user model
var User = require('../models/user');

/* GET home page. */
router.get('/', function(req, res, next) {

  var pageContent = {
    title: 'Express',
    user: req.user,
    section: function(name, options){
      if(!this._sections) this._sections = {};
      this._sections[name] = options.fn(this);
      return null;
    }
  }

  // log.debug('flash', req.flash());
  var flash = req.flash();
  // log.debug('flash', req.flash());
  var flashMess = {};
  for (var action in flash){
    flashMess.type = action;
    flashMess.mess = flash[action].join(',');
    pageContent.notify = JSON.stringify(flashMess)
    break;
  }
  
  // log.debug('flash.info', req.flash('info'));
  res.render('index', pageContent);
});

// Login handler
var login = require('../helpers/passport');
router.post('/login', login);


// Register handler
router.post('/register', function(req, res, next){
  log.debug('POST request to /register');

  // db instance
  var db = res.locals.db;
  
  // express validator
  req.checkBody('registeremail', 'Email empty').notEmpty().isEmail();
  req.checkBody('registerusername', 'Username empty').notEmpty().isLength({
    min: 5
  });
  req.checkBody('registerpassword', 'Password empty').notEmpty().isLength({
    min: 8
  });
  req.checkBody('registerprivacy', 'Privacy must be accepted').notEmpty();

  var errors = req.validationErrors();

  // registration details
  var username = req.body.registerusername;
  var password = req.body.registerpassword;
  var email = req.body.registeremail;

  // check if username exist
  log.debug('Checking if username', username, 'already exist in database');
  User.usernameUnique(res, username, function(){
    // il caso in cui lo username esiste gia' viene gestito dall'interno della funzione, se arrivo qui vuol dire che lo username e' unico
    // check if email exists
    log.debug('Checking if email', email, 'already exist in database');
    User.emailUnique(res, email, function(){
      // user can be registered
      User.register(res, {
        username: username,
        password: password,
        email: email
      }, function(){
        // return success with redirect url
        res.json({
          success: {
            dest: '/boh'
          }
        })
      })

    })
  })
})

// Logout handler
router.get('/logout', function(req, res, next){
  req.logout();
  res.redirect('/');
})

module.exports = router;

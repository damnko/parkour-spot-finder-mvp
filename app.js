var express           = require('express');
var path              = require('path');
var favicon           = require('serve-favicon');
var logger            = require('morgan');
var cookieParser      = require('cookie-parser');
var bodyParser        = require('body-parser');

var routes            = require('./routes/index');
var users             = require('./routes/users');
var interact          = require('./routes/interact');
var spots             = require('./routes/spots');
var spotDett          = require('./routes/spotDett');

var app               = express();

// Helpers
var log               = require('./helpers/log');

// Webpack
var webpack           = require('./helpers/webpack').init(app);

// Custom requires
var config            = require('./config/config'),
    exphbs            = require('express-handlebars'),
    expressValidator  = require('express-validator'),
    passport          = require('passport'),
    session           = require('express-session'),
    flash             = require('connect-flash');

// view engine setup
app.set('views', path.join(__dirname, 'views'));
// Handlebars
app.engine('handlebars', exphbs({defaultLayout: 'main'}));
app.set('view engine', 'handlebars');
// app.set('view engine', 'jade');

// uncomment after placing your favicon in /public
//app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(expressValidator());
app.use(cookieParser());
app.use(session({
  secret: 'keyboard cat',
  resave: false,
  saveUninitialized: true
  // cookie: { secure: true } funziona solo se si ha https, quindi in production bisogna usare un altro modo: vedere qui https://github.com/expressjs/session sotto cookie options
}))
app.use(flash());
app.use(passport.initialize());
app.use(passport.session());
app.use(express.static(path.join(__dirname, 'public')));

// db variable available on each route
app.use(function(req, res, next){
  var db = require('./helpers/db').db();
  res.locals.db = db;
  next();
});
// login info available on every view
app.use(function(req, res, next){
  log.debug('req.user', req.user);
  // res.locals.user = req.user;
  next();
});
// check if auth
function isAuth(req, res, next){
  // if authenticated proceed to the next command
  if (!req.user){
    req.flash('error', 'You must login first');
    res.redirect('/');
    return;
  }
  next();
}

app.use('/', routes);
app.use('/spots', spots);
app.use('/spot', spotDett);
app.use('/interact', isAuth, interact);
app.use('/users', isAuth, users);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  var err = new Error('Not Found');
  err.status = 404;
  next(err);
});

// error handlers

// development error handler
// will print stacktrace
if (app.get('env') === 'development') {
  app.use(function(err, req, res, next) {
    res.status(err.status || 500);
    res.render('error', {
      message: err.message,
      error: err
    });
  });
}

// production error handler
// no stacktraces leaked to user
app.use(function(err, req, res, next) {
  res.status(err.status || 500);
  res.render('error', {
    message: err.message,
    error: {}
  });
});


module.exports = app;

var express       = require('express');
var router        = express.Router();
var log           = require('../../helpers/log'); // logger/winston

router.get('/new-spot', function(req, res, next){
  res.render('./interact/newspot', {
    title: 'Add new spot',
    user: req.user,
    section: function(name, options){
      if(!this._sections) this._sections = {};
      this._sections[name] = options.fn(this);
      return null;
    }
  })
})


// newspot images upload handler
var multer  = require('multer')
// var upload = multer({
//   dest: 'uploads/MERDA'
// })

var uploadLoc = {
  fullres: 'public/images/uploads/fr',
  thumb: 'public/images/uploads/thumb'
}

var storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadLoc.fullres)
  },
  // rename the uploaded file to avoid duplicates
  filename: function (req, file, cb) {
    var filearr = file.originalname.split('.');
    // file extension
    var ext = filearr.pop();
    // newname is old name (without extension) with attached the unixtime
    var newname = filearr.join('.') + '-' + Date.now() + '.' + ext;
    cb(null, newname)
  }
})

var upload = multer({ storage: storage })

// img utils for img compression
var imgUtils = require('../../helpers/img');

// img upload route
router.post('/newspot/diocan', upload.any(), function (req, res, next) {

  imgUtils.compressAll(req.files, uploadLoc, function(){
    log.debug('all images have been compressed');

    var imgs = [];

    var i = 0;
    req.files.forEach(function(img){
      imgUtils.getSize(img.filename, uploadLoc, function(size){
        log.debug('got size back of ', size);
        imgs.push({
          name: img.filename,
          size: size
        })
        i++;
        // if we got the sizes of all images, then send back the imgs name
        if (i == req.files.length){
          // pass the filenames to the client so they can be saved in db with the spot infos
          res.json({
            name: JSON.stringify(imgs)
          })
        }

      })
    })

    
  })
  

  // req.files is the array that contains all uploaded file info
  // req.files.forEach(function(el){
  //   log.debug('uploaded file', el);
  //   imgUtils.compress(el, uploadLoc);
  // })
   

  

})

// CUSTOM ERROR HANDLING FOR UPLOAD/DROPZONE
// router.post('/newspot/diocan', function (req, res) {
//   upload(req, res, function (err) {
//     if (err) {
//       log.debug('errore', req.file, err)
//       // An error occurred when uploading
//       return
//     }
//     log.debug('ok uppato')
//     log.debug(req.file)
//     res.send('ok uppato')

//     // Everything went fine
//   })
// })

var Trick = require('../../models/trick');
router.get('/tricks/:trick.json', function(req, res, next){
  var str = req.params.trick.trim();
  var db = res.locals.db;

  Trick.search(db, str, function(tricks){
    log.debug('tricks found', tricks)
    tricks.forEach(function(doc) {
      console.log(doc._id + " type " + typeof doc._id);
      // console.log(doc._id.toString() + " type " + typeof doc._id.toString());
    })
    res.json(tricks)
  })
})

var Spot = require('../../models/spot');
router.post('/action/suggestSpot', function(req, res, next){
  log.debug('req.body', req.body)

  // db instance
  var db = res.locals.db;
  
  // express validator
  req.checkBody('lat', 'Spot address is not complete').notEmpty();
  req.checkBody('lng', 'Spot address is not complete').notEmpty();
  req.checkBody('formatted_address', 'Spot address is not complete').notEmpty();
  req.checkBody('name', 'Spot name empty').notEmpty();
  req.checkBody('tricks', 'Tricks list empty').notEmpty();

  var errors = req.validationErrors();

  if (errors)
    return res.json({
      errors: errors
    })

  // fields values
  var spotDetails = {
    // geo coords in format [longitude, latitude]
    loc: {
      type: 'Point',
      coordinates: [parseFloat(req.body.lng), parseFloat(req.body.lat)]
    },
    formatted_address: req.body.formatted_address,
    name: req.body.name.trim(),
    description: req.body.description,
    img: req.body.imgText,
    tricks: req.body.tricks
  }

  Spot.add(db, spotDetails, function(err, result){
    if (err)
      return res.json({
        critical: 'There was an error during db save'
      })
    res.json({
      success: {
        mess: 'spot salvato',
        dest: '/interact/new-spot'
      },
      flash: {
        type: 'info',
        mess: 'Ok spot inserito'
      }
    })
  })

})

// search for nearby spots
router.get('/findNearby', function(req, res, next){
  var db = res.locals.db;
  var data = req.query;
  log.debug('looking for spots nearby', req.query);

  Spot.findNearby(db, data, function(err, spots){
    if (err){
      res.json({
        error: err
      })
      return;
    }
    res.json({
      spots: spots
    })
  })
})

module.exports = router;

var log           = require('./log'); // logger/winston
// image manipulation

// for image manipulation (imagemagick and graphicsmagick have to be installed via sudo apt-get install ....)
// documentation here https://github.com/aheckmann/gm
var fs = require('fs')
  , gm = require('gm');

module.exports = (function(){

  function compressAll(imgs, uploadLoc, callback){
    var count = imgs.length;
    var i=-1;
    var compressed = 0;
    log.debug('called compressAll with imgs', imgs)
    imgs.forEach(function(img){
      log.debug('img', img);
      compress(img, uploadLoc, function(){
        log.debug('will now create thumb for', img.filename);
        // anche nel createthumb in teoria avrei dovuto chiamare una callback per proseguire
        createThumb(img, uploadLoc);
        compressed++;
        // when all images have been compressed, call the callback and exit
        if (compressed==count){
          log.debug('ok all images have been compressed')
          callback()
        }
      })
      
    })
  }

  function compress(el, uploadLoc, callback){
    log.debug('called compress for', el);
    // compress each file
    // il file originale viene sovrascritto, dovrei anche guardare questo articolo per ottimizzare la compressione delle immagini
    // https://www.smashingmagazine.com/2015/06/efficient-image-resizing-with-imagemagick/
    gm(uploadLoc.fullres + '/' + el.filename)
    .noProfile()
    .quality(85)
    .filter('triangle')
    .write(uploadLoc.fullres + '/' + el.filename, function (err) {
      if (!err){
        log.debug('compressed image', el.filename);
        log.debug('callback', callback);
        callback;
      }
      else
        log.error('error while compressing image', err)
    });
  }

  function createThumb(el, uploadLoc){
    // create thumbnails for each file
    gm(uploadLoc.fullres + '/' + el.filename)
    .quality(85)
    .filter('triangle')
    .resize(560)
    .crop(560, 245)
    .noProfile() // remove EXIF profile data
    .write(uploadLoc.thumb + '/' + el.filename, function (err) {
      if (!err)
        log.debug('created thumb for', el.filename)
      else
        log.error('error while creating thumb', err)
    });
  }

  // function to get the px size of the image
  function getSize(img, uploadLoc, callback){
    log.debug('called getSize with', img);
    gm(uploadLoc.fullres + '/' + img).size(function(err, value){
      log.debug('getting size of img ', img, 'it is ', value);
      // if value is undefined returns a default
      var size = value.width + "x" + value.height || "1024x768";
      callback(size);
    })
  }

  return {
    compress: compress,
    compressAll: compressAll,
    getSize: getSize
  }
})()
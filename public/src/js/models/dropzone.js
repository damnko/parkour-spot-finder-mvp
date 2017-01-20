
import Dropzone from '../../vendor/dropzone-master/dist/dropzone.js'
import dropcss from '../../vendor/dropzone-master/dist/dropzone.css'


var dropzone = (function($){
  l.debug('dropzone loaded')

  var myDropzone;

  function init(ev, params, target){
    l.debug('dropzone initiated')
    
    Dropzone.autoDiscover = false;

    var defaultParams = {
      autoProcessQueue: false,
      acceptedFiles: 'image/*',
      maxFiles: 5,
      maxFilesize: 50,
      uploadMultiple: true,
      parallelUploads: 10 // questo serve altrimenti uppa al max 2 file e poi si ferma (altrimenti devo mettere autoProcessQueue: true)
    }

    var mergedParams = _.extend(defaultParams, params)
    myDropzone = new Dropzone(target, mergedParams);

    config(myDropzone);
    // Dropzone.options.imgDrop = {
    //   maxFilesize: 5, // MB
    //   drop: function(file) {
    //     l.debug('started drag of file', file)
    //   }
    // };
  }
  
  function config(myDropzone){

    myDropzone.on("drop", function(file) {
      l.debug('started drag of file', file)
        /* Maybe display some more file information on your page */
      });
    myDropzone.on('maxfilesexceeded', function(){
      l.error('troppi file stai cercando di uppare')
    })
    myDropzone.on('completemultiple', function(){
      l.debug('upload complete')
      $.publish('dropzone.uploadFinished')
    })
    myDropzone.on('successmultiple', function(res, custom){
      l.debug('upload completed successfully')
      l.debug('res', res)
      l.debug('custom var passed', custom)

      $.publish('newspot.imgUploaded', custom.name)
    })
  }

  function upload(ev, rename){
    myDropzone.options.renameFilename = function(name){
      var ext = name.split('.').pop()
      return rename + '.' + ext;
    }
    l.debug('upload started', myDropzone.getQueuedFiles())
    if (myDropzone.getQueuedFiles().length > 0){
      l.debug('there are files to upload')
      myDropzone.processQueue()
    }
    else{
      l.debug('no files to upload')
      $.publish('dropzone.uploadFinished')
    }
  }

  $.subscribe('dropzone.init', init)
  $.subscribe('dropzone.upload', upload)
})(jQuery)

module.exports = dropzone
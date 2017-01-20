
import gmaps from '../models/gmaps'
import dropzone from '../models/dropzone'
import tokenizer from '../models/tokenizer'
// plugins and other imports


// var Dropzone = require("dropzone");

var newspot = (function($, google){
  function rename(){
    // l.debug('#####################rename')
    var name = $('#name').val().trim()
    // l.debug('#####################name', name)
    var locality = $('#locality').val().trim()
    return fixit(name) + '-' + fixit(locality)
  }
  function fixit(str){
    return str.split(' ').join('-').toLowerCase()
  }
  function init(){
    l.debug('newspot loaded');
    // init image dropzone

    var dropzoneParams = {
      url: "/interact/newspot/diocan"
    }

    // These are the constraints used to validate the form
    var constraints = {
      lat: {
        presence: true
      },
      lng: {
        presence: true
      },
      route: {
        presence: true
      },
      name: {
        presence: true
      },
      tricks: {
        presence: true
      }
    }

    // $('form').on('keypress keydown keyup', function(e) {
    //   // l.debug('form keypress', e)
    //     if (e.keyCode == 13) {
    //         //alert(e.which); 
    //         e.preventDefault();
    //         // return true;
    //     }
    // });
    
    // Append form validation to newspot form
    $.publish('appendFormValidation', ['newspot', constraints, uploadFirst])
    // Init google maps
    $.publish('newspot.initMap')
    // Init upload handler with dropzone
    $.publish('dropzone.init', [dropzoneParams, '#imgDrop'])
    // Init trick typeahead and tokenizer
    $.publish('tokenfield.init', 'tricks')
    
  }

  // This function will upload images first, and then send the form to the server
  function uploadFirst(callback){
    l.debug('publishing dropzone upload and subscribing to callback', callback)
    $.subscribe('dropzone.uploadFinished', callback)
    $.publish('dropzone.upload', rename())
  }

  function imgUploaded(ev, img){
    $('#imgText').val(img)
  }


  function resetAddress(){
    $('.mapAddress').val('');
  }

  function populateAddress(ev, address, geo, formatted_address){
    resetAddress();
    var i = 0;
    while(address[i]){
      var addressType = address[i].types[0];
      var addressVal = address[i].short_name;
      $('#' + addressType).val(addressVal);
      i++;
    }
    $('#lat').val(geo.lat());
    $('#lng').val(geo.lng());
    // var latlng = {
    //   lat: geo.lat(),
    //   lng: geo.lng()
    // };
    $('#formatted_address').val(formatted_address);
    // reverse(latlng);
  }
  function formErrors(ev, errors){
    // check if there are errors in lat, lng or route
    if ('lat' in errors || 'lng' in errors || 'route' in errors){
      l.debug('not lat, lng or route defined - probably the spot is not well selected on the map, too generic')
      $.publish('notie', {
        type: 'error',
        mess: 'The spot location seems to be too generic, try to place it better on the map'
      })
      // $('#pac-input').addClass('form-error').insertAfter('errore qui')
    }
  }

  $.subscribe('newspot.populateAddress', populateAddress)
  $.subscribe('newspot.init', init)
  $.subscribe('newspot.imgUploaded', imgUploaded)
  $.subscribe('form.hasErrors', formErrors)
  
})(jQuery, google)

module.exports = newspot

import moment from 'moment'

var maps = (function($){

  // Reverse geolocation, get address from gps coords
  function reverse(latlng, callback){
    var geocoder = new google.maps.Geocoder;
    l.debug('latlng', latlng);
    geocoder.geocode({'location': latlng}, function(results, status) {
      l.debug('latlng', latlng);
      l.debug('reverse geocode', results)
      if (status === google.maps.GeocoderStatus.OK) {
        if (results[0]) {
          results[0].name = latlng.lat + ', ' + latlng.lng;
          callback(results[0]);
          /*
          map.setZoom(11);
          var marker = new google.maps.Marker({
            position: latlng,
            map: map
          });
          infowindow.setContent(results[1].formatted_address);
          infowindow.open(map, marker);
          */
          
        } else {
          $.publish('notie', {
            type: 'error',
            mess: 'No results found for ' + latlng.lat + ', ' + latlng.lng
          });
          l.debug('No results found for gps coords ' + latlng)
          // window.alert('No results found');
        }
      } else {
        $.publish('notie', {
          type: 'error',
          mess: 'Error while geocoding your gps coords'
        });
        l.error('Geocoder failed due to: ' + status)
        // window.alert('Geocoder failed due to: ' + status);
      }
      
    });
    l.debug('finito reverse');
    // return res;
  }
 
  function isGeo(input){
    l.debug('testing if ' + input + ' is geo coords');
    var georegex = /^[+-]?\d+(\.)?(\d+)?,[+-]?\d+(\.)?(\d+)?$/gi;
    var isgeo = georegex.test(input)
    l.debug(input + ' is geo coords', isgeo)
    return isgeo
  }

  function initMap_newspot(ev) {
    l.debug('newspot map initiated')
    
    var input = /** @type {!HTMLInputElement} */(document.getElementById('pac-input'));

    map.controls[google.maps.ControlPosition.TOP_LEFT].push(input);

    // listens for marker dragged
    marker.addListener('dragend', function(ev) {
      var latlng = {
        lat: ev.latLng.lat(),
        lng: ev.latLng.lng()
      }
      l.debug('new marker position', latlng)
      reverse(latlng, updateMap)
    });

    var autocomplete = new google.maps.places.Autocomplete(input,{types: ['geocode']});
    autocomplete.bindTo('bounds', map);

    autocomplete.addListener('place_changed', function() {
      l.debug('called place_changed');

      // check if it's geo coords
      var val = $('#pac-input').val().replace(' ', '');
      if (isGeo(val)){
        var latlng = {
          lat: parseFloat(val.split(',')[0]),
          lng: parseFloat(val.split(',')[1])
        };
        l.debug('latlng', latlng)
        // reverse geolocation
        reverse(latlng, updateMap)
      }else{
        var place = autocomplete.getPlace();
        updateMap(place);
      }
    });
  }

  function updateMap(place){
    l.debug('updating map')
    infowindow.close();
    marker.setVisible(false);
    // var place = autocomplete.getPlace();
    l.debug('place', place);
    if (!place.geometry) {
      $.publish('notie', {
        type: 'error',
        mess: 'No results found for the typed address',
        overlay: true
      });
      l.error("Autocomplete's returned place contains no geometry", place)
      // window.alert("Autocomplete's returned place contains no geometry");
      return;
    }

    l.debug('place components', place);
    $.publish('newspot.populateAddress', [place.address_components, place.geometry.location, place.formatted_address])
    // populateAddress(place.address_components, place.geometry.location);

    // If the place has a geometry, then present it on a map.
    if (place.geometry.viewport) {
      map.fitBounds(place.geometry.viewport);
    } else {
      map.setCenter(place.geometry.location);
      map.setZoom(17);  // Why 17? Because it looks good.
    }


    // search for spots near the selected location
    var data = {
      lng: place.geometry.location.lng(),
      lat: place.geometry.location.lat(),
    }
    $.ajax({
      url: '/interact/findNearby',
      data: data,
      dataType: 'JSON',
      type: 'GET',
      beforeSend: function(){
        l.debug('searching for nearby spots')
      },
      success: function(res){
        if (res.error){
          $.publish('notie', {
            type: 'error',
            mess: 'There was an error during spot detection'
          })
          return;
        }

        // remove all current markers
        if (markers){
          markers.forEach(function(marker){
            // delete all markers from map
            marker.setMap(null);
            // remove all event listeners for specific marker
            google.maps.event.clearInstanceListeners(marker);
          })
        }

        // add spot markers and infowindows
        if (res.spots.length > 0)
          addNearbyMarkers(res.spots)

        // add editable marker related to spot
        // remove previous circles
        if (searchCircle)
          searchCircle.setMap(null);
        // add new search circle
        searchCircle = new google.maps.Circle({
          strokeColor: '#FF0000',
          strokeOpacity: 0.8,
          strokeWeight: 2,
          fillColor: '#FF0000',
          fillOpacity: 0.15,
          map: map,
          center: place.geometry.location,
          radius: 100 // in meters
        });

        marker.setIcon(/** @type {google.maps.Icon} */({
          url: place.icon,
          size: new google.maps.Size(71, 71),
          origin: new google.maps.Point(0, 0),
          anchor: new google.maps.Point(17, 34),
          scaledSize: new google.maps.Size(35, 35),
          zIndex: 99999
        }));
        marker.setPosition(place.geometry.location);
        marker.setVisible(true);

        var address = '';
        if (place.address_components) {
          address = [
            (place.address_components[0] && place.address_components[0].short_name || ''),
            (place.address_components[1] && place.address_components[1].short_name || ''),
            (place.address_components[2] && place.address_components[2].short_name || '')
          ].join(' ');
        }

        infowindow.setContent('<div><strong>' + place.name + '</strong><br>' + address);
        infowindow.open(map, marker);
      },
      error: function(xh, status, error){
        l.debug('there was an error during nearby spots search', error)
        $.publish('notie', {
          type: 'error',
          mess: 'There was an error during spot detection'
        })
      }
    })
  }

  function addNearbyMarkers(spots){
    l.debug('adding nearby markers', spots)
    
    // get handlebars template and compile
    var source   = $("#mapInfowindow-template").html();
    var template = h.compile(source);

    markers = []
    var infowindows = []
    spots.forEach(function(spot){
      var coords = {
        lat: spot.loc.coordinates[1],
        lng: spot.loc.coordinates[0]
      }
      markers.push(new google.maps.Marker({
        position: coords,
        map: map,
        title: spot.name,
        _id: spot._id,
        icon: '/images/pin.png'
      }));
      // check if there is an image
      var context = {
        img: spot.img ? spot.img[0].name : false,
        name: spot.name,
        address: spot.formatted_address,
        url: '/spot/' + spot._id + '/' + encodeURIComponent(spot.name.replace(' ', '-'))
      }
      infowindows.push(new google.maps.InfoWindow({
        content: template(context)
      }))
      l.debug('added spot name', spot.name)
    })
    l.debug('infowindows', infowindows)
    // create click event listener for each marker
    var i = 0
    markers.forEach(function(marker){
      var info = infowindows[i]
      l.debug(i, 'i infowindo', infowindows[i])
      marker.addListener('click', function(){
        infowindows.forEach(function(info){
          info.close()
        })
        info.open(map, marker)
      })
      i++
    })


  }

  // Common map elements
  var map = new google.maps.Map(document.getElementById('map'), {
    center: {lat: -33.8688, lng: 151.2195},
    zoom: 13
  });

  var infowindow = new google.maps.InfoWindow();
  var marker = new google.maps.Marker({
    map: map,
    animation: google.maps.Animation.DROP,
    draggable: true,
    anchorPoint: new google.maps.Point(0, -29)
  });
  var searchCircle;

  // HANDLERS FOR SPOT SEARCH
  function initMap_spots(ev) {
    l.debug('search spot map initiated')

    suggestions();
    
    var input = /** @type {!HTMLInputElement} */(document.getElementById('location'));

    var autocomplete = new google.maps.places.Autocomplete(input,{types: ['geocode']});
    autocomplete.bindTo('bounds', map);

    $('#submit-filters').on('click', function(){
      l.debug('autocomplete', autocomplete.getPlace())
    })

    // Define the LatLng coordinates for the polygon's path.
    // coordinates=[0=[11.915081032104467, 45.374966223449], 1=[11.915081032104467, 45.31464110561862], 2=[11.819808967895483, 45.31464110561862], 3=[11.819808967895483, 45.374966223449]]

      var triangleCoords = [
        {lat: 45.374966223449, lng: 11.915081032104467},
        {lat: 45.31464110561862, lng: 11.915081032104467},
        {lat: 45.31464110561862, lng: 11.819808967895483},
        {lat: 45.374966223449, lng: 11.819808967895483}
      ];

    autocomplete.addListener('place_changed', function() {
      l.debug('called place_changed');

      // check if it's geo coords
      var val = $('#location').val().replace(' ', '');
      if (isGeo(val)){
        var latlng = {
          lat: parseFloat(val.split(',')[0]),
          lng: parseFloat(val.split(',')[1])
        };
        l.debug('latlng', latlng)
        // reverse geolocation
        reverse(latlng, updateSpotsMap)
      }else{
        var place = autocomplete.getPlace();
        updateSpotsMap(place);
      }
    });

    map.addListener('idle', function(e) {
      l.debug('map center_changed', e)

      // if the map move is triggered because of a marker being clicked, i do not trigger a new search
      if (markerClicked){
        // reset the global variable
        markerClicked = false
        return
      }
      searchBounds()  
      
      
    });
    // map.addListener('zoom_changed', function() {
    //   l.debug('map zoom_changed')
    //   searchBounds()
    // });
  }

  function initMap_spotDett(ev){

    // get the coords
    var lat = parseFloat($('#map').data().lat);
    var lng = parseFloat($('#map').data().lng);

    // Common map elements
    var map = new google.maps.Map(document.getElementById('map'), {
      center: {lat: lat, lng: lng},
      zoom: 13
    });

    var marker = new google.maps.Marker({
      map: map,
      animation: google.maps.Animation.DROP
    });

    // place marker and set position in map
    marker.setPosition(new google.maps.LatLng( lat, lng ));
    marker.setVisible(true);
  }
  $.subscribe('spotDett.initMap', initMap_spotDett)

  function suggestions(){
    
    var service = new google.maps.places.AutocompleteService();

    var spots = new Bloodhound({
      datumTokenizer: Bloodhound.tokenizers.obj.whitespace('name'),
      queryTokenizer: Bloodhound.tokenizers.whitespace,
      remote: {
        url: '/spots/suggest/%QUERY.json',
        wildcard: '%QUERY'
      }
    });

    $('#suggestions').typeahead({
      hint: true,
      highlight: true,
      minLength: 2,
      classNames: {
        menu: 'tt-dropdown-menu'
      }
    },
    {
      name: 'nhl-teams',
      display: 'name',
      source: spots,
      templates: {
        header: '<h3 class="league-name">Spots</h3>'
      }
    },
    {
      name: 'ladro',
      limit: 10,
      display: 'address',
      source: function (q, sync, async) {
        console.log(q);
        service.getQueryPredictions({ input: q }, function(suggestions, status){
          l.debug('suggestions', suggestions);
          var arr = [];
          suggestions.forEach(function(el){
            arr.push({address: el.description, placeId:el.place_id})
          })
          async(arr)
        });
      },
      templates: {
        header: '<h3 class="league-name">Places</h3>'
      }
    }
    );
    
    $('#suggestions').bind('typeahead:select', function(ev, suggestion) {
      l.debug('suggestion selected', ev, suggestion)
      l.debug('window', window)
      if (suggestion.placeId)
        getDetails(suggestion.placeId)
      else
        window.location.href = '/spot/' + suggestion._id + '/' + $.param(suggestion.name.replace(' ', '-'))
    });

    var getDetails = function(id){
      var dettService = new google.maps.places.PlacesService(map);
      dettService.getDetails({
        placeId: id
      }, function(place, status) {
        if (status === google.maps.places.PlacesServiceStatus.OK) {
          l.debug('placeid details', place)
          updateSpotsMap(place)
        }else{
          l.debug('error in getdetails', status)
        }
      });
    }
    
  }


  // FILTERING HANDLING
  var filters = {
    datetime: function(){
      // date
      var date = $('#datepicker').val()
      // time
      var timeFrom = $('#timepicker-from').val()
      var timeTo = $('#timepicker-to').val()

      // if no datetime filters are applied, then return undefined
      if (date == '' && timeFrom == '' && timeTo == '')
        return ''

      // set default date and time if some values are missing
      // if time is set but no date, set date as today
      if ((timeFrom != '' || timeTo != '') && date == '')
        date = moment().format('YYYY-MM-DD')
      // if timeFrom or timeTo are not defined, set them to start and end of the day
      timeFrom = (timeFrom != '') ? timeFrom : '00:00'
      timeTo = (timeTo != '') ? timeTo : '23:59'

      l.debug('timefrom', timeFrom)
      l.debug('timeto', timeTo)

      // create from/to dates
      var dateFrom = moment(date + ' ' + timeFrom).format()
      var dateTo = moment(date + ' ' + timeTo).format()
      return {
        from: dateFrom,
        to: dateTo
      }
    },
    rating: function(){
      var rating = $('#rating').val()
      return rating
    },
    tricks: function(){
      var tricks = $('#tricks').val()
      var tricksLogic = $('#tricksLogic').val()
      if (tricks == '')
        return ''

      return {
        list: tricks,
        logic: tricksLogic
      }
    }
  }

  function setBounds(ev, bounds){
    map.fitBounds(bounds);
  }
  $.subscribe('map.setBounds', setBounds)

  function searchBounds(ev, page=1){
    $('.spotsFound-wrap .loading').removeClass('hidden');
    l.debug('map bounds_changed, bounds are', map.getBounds().toJSON())
    l.debug('map bounds_changed NE lat, bounds are', map.getBounds().getNorthEast().lat())
    l.debug('map bounds_changed NE lng, bounds are', map.getBounds().getNorthEast().lng())
    l.debug('map bounds_changed SW lat, bounds are', map.getBounds().getSouthWest().lat())
    l.debug('map bounds_changed SW lng, bounds are', map.getBounds().getSouthWest().lng())

    // spots per page limit
    var limit = 2

    // var location = {
    //   bounds: map.getBounds().toJSON()
    // }
    var data = {
      location: {
        bounds: map.getBounds().toJSON()
      },
      datetime: filters.datetime(),
      rating: filters.rating(),
      tricks: filters.tricks(),
      page: page,
      limit: limit
    }

    l.debug('type', data.datetime)
    l.debug('data', data)

    // change url
    history.replaceState(data, "spotFiltering", '/spots/filter/' + encodeURIComponent(JSON.stringify(data)));

    // search the bounds for spots
    $.ajax({
      url: '/spots/searchBounds',
      type: 'GET',
      dataType: 'JSON',
      data: data,
      beforeSend: function(){
        l.info('looking bounds of', map.getBounds())
        // show loading text in filter button
        $('#submit-filters')
          .html('<i class="fa fa-circle-o-notch fa-spin"></i> Filtering spots')
          .prop('disabled', true)
      },
      success: function(res){
        if (res.error){
          $.publish('notie', {
            type: 'error',
            mess: res.error
          });
          return
        }
        if (res.success){
          l.info('found xxx spots', res.success)
          if (res.success.spots.length > 0){
            placeMarkers(null, res.success.spots);
            // publish the event for listeners
            
            l.debug('found a total of ', res.success.count, ' spots')

          }
          if ($('.filters-wrap').is(':visible'))
            $('#spotLocation .showFilters').click()

          $.publish('maps.spotsFound', {
            spots: res.success.spots,
            count: res.success.count,
            page: res.success.page
          })
        }
        $('#submit-filters')
          .html('Filter spots')
          .prop('disabled', false)
      }
    })
    $('.spotsFound-wrap .loading').addClass('hidden');
  }
  $.subscribe('searchBounds', searchBounds)

  // BACKUP
  // function searchBounds(page=1){
  //   l.debug('map bounds_changed, bounds are', map.getBounds().toJSON())
  //   l.debug('map bounds_changed NE lat, bounds are', map.getBounds().getNorthEast().lat())
  //   l.debug('map bounds_changed NE lng, bounds are', map.getBounds().getNorthEast().lng())
  //   l.debug('map bounds_changed SW lat, bounds are', map.getBounds().getSouthWest().lat())
  //   l.debug('map bounds_changed SW lng, bounds are', map.getBounds().getSouthWest().lng())

  //   var limit = 2

  //   // var location = {
  //   //   bounds: map.getBounds().toJSON()
  //   // }
  //   var data = {
  //     location: {
  //       bounds: map.getBounds().toJSON()
  //     },
  //     page: page,
  //     limit: limit
  //   }
  //   // search the bounds for spots
  //   $.ajax({
  //     url: '/spots/searchBounds',
  //     type: 'GET',
  //     dataType: 'JSON',
  //     data: data,
  //     beforeSend: function(){
  //       l.info('looking bounds of', map.getBounds())
  //     },
  //     success: function(res){
  //       if (res.error){
  //         $.publish('notie', {
  //           type: 'error',
  //           mess: res.error
  //         });
  //         return
  //       }
  //       if (res.success){
  //         l.info('found xxx spots', res.success)
  //         if (res.success.spots.length > 0){
  //           placeMarkers(null, res.success.spots);
  //           // publish the event for listeners
  //           $.publish('maps.spotsFound', {
  //             spots: res.success.spots,
  //             count: res.success.count,
  //             page: res.success.page
  //           })
  //           l.debug('found a total of ', res.success.count, ' spots')

  //         }
  //       }
  //     }
  //   })
  // }

  function getMapBounds(ev, callback){
    callback(map.getBounds().toJSON());
  }
  $.subscribe('getMapBounds', getMapBounds);

  function updateSpotsMap(place){
    l.debug('updating map')
    // l.debug('infow', infowindow)
    // infowindow.close();
    marker.setVisible(false);
    // var place = autocomplete.getPlace();
    l.debug('place', place);
    if (!place.geometry) {
      $.publish('notie', {
        type: 'error',
        mess: 'No results found for the typed address',
        overlay: true
      });
      l.error("Autocomplete's returned place contains no geometry", place)
      // window.alert("Autocomplete's returned place contains no geometry");
      return;
    }

    l.debug('place components', place);

    // If the place has a geometry, then present it on a map.
    if (place.geometry.viewport) {
      map.fitBounds(place.geometry.viewport);
    } else {
      map.setCenter(place.geometry.location);
      map.setZoom(17);  // Why 17? Because it looks good.
    }

    l.debug('map bounds are', map.getBounds())
  }

  var markers = [];
  var markerClicked = false;
  function placeMarkers(ev, spots){
    l.debug('placing markers', spots)
    l.debug('markers placeMarkers', markers)
    if (markers){
      markers.forEach(function(marker){
        // delete all markers from map
        marker.setMap(null);
        // remove all event listeners for specific marker
        google.maps.event.clearInstanceListeners(marker);
      })
    }

    // get handlebars template and compile
    var source   = $("#mapInfowindow-template").html();
    var template = h.compile(source);

    markers = []
    infowindow = []
    spots.forEach(function(spot){
      var coords = {
        lat: spot.loc.coordinates[1],
        lng: spot.loc.coordinates[0]
      }
      markers.push(new google.maps.Marker({
        position: coords,
        map: map,
        title: spot.name,
        _id: spot._id
      }));
      // check if there is an image
      var context = {
        img: spot.img ? spot.img[0].name : false,
        name: spot.name,
        address: spot.formatted_address,
        url: '/spot/' + spot._id + '/' + encodeURIComponent(spot.name.replace(' ', '-'))
      }
      infowindow.push(new google.maps.InfoWindow({
        content: template(context)
      }))
      l.debug('added spot name', spot.name)
    })
    l.debug('infowindow', infowindow)
    // create click event listener for each marker
    var i = 0
    markers.forEach(function(marker){
      var info = infowindow[i]
      l.debug(i, 'i infowindo', infowindow[i])
      marker.addListener('click', function(){
        infowindow.forEach(function(info){
          info.close()
        })
        info.open(map, marker)
        $.publish('map.markerClicked', this._id)
        // if a marker is clicked i set a global variable to true, so i can check for it on map.event.idle and not trigger another bounds search
        markerClicked = true
        l.debug('clicked marker with id', this._id)
      })
      i++
    })
    
  }
  $.subscribe('map.placeMarkers', placeMarkers)

  $.subscribe('newspot.initMap', initMap_newspot);
  $.subscribe('spots.initMap', initMap_spots);

})(jQuery)

module.exports = maps
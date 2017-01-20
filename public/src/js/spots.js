// COMMON IMPORTS
import * as common from './common'

import gmaps from './models/gmaps'
// glide here http://glide.jedrzejchalubek.com/docs.html
import glide from '../vendor/Glide.js-master/dist/glide.js'
import glideCoreCSS from '../vendor/Glide.js-master/dist/css/glide.core.css'
import glideThemeCSS from '../vendor/Glide.js-master/dist/css/glide.theme.css'

// photoswipe for image zoom
import photoswipe from './models/photoswipe'

// pikaday for datepicker
// il css lo prendo da vendor mentre il js da node_modules...ho fatto cosi perche' non funzionava se prendevo anche il js da /vendor
import PikdayCss from '../vendor/Pikaday-master/css/pikaday.css'
import Pikaday from 'pikaday'
// moment for pikaday
import moment from 'moment'
// timepicker
import timepicker from '../vendor/jonthornton-jquery-timepicker/jquery.timepicker.js'
import timepickerCss from '../vendor/jonthornton-jquery-timepicker/jquery.timepicker.css'
// jquery bar rating
import rating from 'jquery-bar-rating'
import ratingCss from '../vendor/jquery-bar-rating-master/dist/themes/fontawesome-stars.css'
// taginput for typeahead
// non posso fare l'import del typeahead come sotto perche' c'e' un bug legato a webpack, quindi ho messo direttamente il src nella view spots.handlebars
// import typeahead from '../vendor/typeahead.bundle.js'
import tagsinputCSS from '../vendor/bootstrap-tagsinput-latest/src/bootstrap-tagsinput.css'
import tagsinput from '../vendor/bootstrap-tagsinput-latest/src/bootstrap-tagsinput.js'

// image lazy loading http://dinbror.dk/blazy/
(function($){
  
  // qui avrei dovuto fare un modulo o cmq una funzione/variabile che gestisse ogni plugin separatamente, cosi in futuro potevo aggiungere altri metodi che erano legati a quel plugin (un po come ho fatto per google maps)
  var initPlugins = {
    // datepicker
    datepicker: function(){
      var picker = new Pikaday({
        field: $('#datepicker')[0],
        minDate: moment().toDate()
      });
    },
    // timepicker
    // options here http://jonthornton.github.io/jquery-timepicker/
    timepicker: function(){
      // get next 30 mins slot
      // var minNow = parseInt(moment().format('mm'))
      // var timeSlot = (minNow>=30) ? '00' : '30'
      // init timepicker
      $('.timepicker').timepicker({
        timeFormat: 'H:i',
        show2400: true
      });
    },
    rating: function(){
      $('#rating').barrating({
        theme: 'fontawesome-stars',
        onSelect:function(value, text, event){
          $('#remove-rating').removeClass('hidden')
        }
      });
      // listen for rating reset
      $('#remove-rating').on('click', function(){
        $('#rating').barrating('clear')
        $(this).addClass('hidden')
      })
    },
    tricks: {
      getList: function(){
        var self = this
        $.ajax({
          url: '/spots/tricks',
          data: '',
          dataType: 'JSON',
          type: 'GET',
          beforeSend: function(){
            l.debug('getting list of tricks to populate filters')
          },
          success: function(res){
            if (res.error){
              $.publish('notie', {
                type: 'error',
                mess: 'Error while getting tricks list to populate filters'
              })
              return
            }
            l.debug('got list of tricks', res.tricks)
            // init typeahead and create tricks checklist
            self.initTypeahead(res.tricks)
            self.createTrickList(res.tricks)
          }
        })
      },
      initTypeahead: function(tricks){
        // typeahead.bundle deve essere incluso nella pagina per far funzionare il tokenizer
        var tricksTypeahead = new Bloodhound({
          datumTokenizer: Bloodhound.tokenizers.obj.whitespace('name'),
          queryTokenizer: Bloodhound.tokenizers.whitespace,
          local: tricks
        });
        tricksTypeahead.initialize();

        $('#tricks').tagsinput({
          itemValue: '_id',
          itemText: 'name',
          typeaheadjs: {
            name: 'tricks',
            displayKey: 'name',
            source: tricksTypeahead.ttAdapter()
          }
        });

        $('#tricks').on('itemAdded', function(event) {
          l.debug('added trick event', event)
          // checkbox is clicked only if event is triggered from typeahead, not from a click of the checkbox
          if (!event.options){
            l.debug('added trick', event.item, 'from typeahead')
            $('#'+event.item._id).click()
          }else{
            l.debug('added trick', event.item, 'from checklist')
          }
          // $(event.item.id)
          // event.item: contains the item
        }).on('itemRemoved', function(event) {
          l.debug('removed trick event', event)
          // checkbox is clicked only if event is triggered from typeahead, not from a click of the checkbox
          if (!event.options){
            l.debug('removed trick', event.item, 'from typeahead')
            $('#'+event.item._id).click()
          }else{
            l.debug('removed trick', event.item, 'from checklist')
          }
          // $(event.item.id)
          // event.item: contains the item
        });

        this.listenTricksCheckbox(tricksTypeahead)
      },
      createTrickList: function(tricks){
        // get handlebars template and compile
        var source   = $("#trickCheckbox-template").html();
        var template = h.compile(source);
        var tricksHtml = ""

        tricks.forEach(function(trick){
          // create context and output html
          var context = {
            _id: trick._id,
            name: trick.name
          };
          var html = template(context);
          tricksHtml += html
        })

        $('#tricksList').html(tricksHtml)
        
      },
      listenTricksCheckbox: function(tricksTypeahead){
        $('#tricksList').on('click', 'input', function(ev){
          var el = $(this)
          var data = {
            _id: el.val(),
            name: el.data().name
          }
          if (el.is(':checked')){
            l.debug('adding', data, 'to tricks tagsinput')
            $('#tricks').tagsinput('add', data, {stop: true});
          }else{
            l.debug('removing', data, 'from tricks tagsinput')
            $('#tricks').tagsinput('remove', data, {stop: true});
          }
        })
      }
    }
  }



  function init(){
    $.publish('spots.initMap');
    // init glide slider
    $(".glide").glide({
        type: "carousel",
        autoheight: true,
        autoplay: false
    });
    // listen for images click: zoom gallery
    photoswipe.initSpots();
    photoswipe.spotDett();
    // listen for pagination
    $('#pagination').on('click', 'a', function(ev){
      var target = $(this).attr('target');
      if (target){
        l.debug('clicked pagination for page', target)
        changePage(target)
      }
    })
    // prevent form submit (occurs when place autocomplete is chosen)
    $('#spotLocation').on('submit', function(ev){
      ev.preventDefault();
    })

    // init filters plugins
    initPlugins.datepicker()
    initPlugins.timepicker()
    initPlugins.rating()
    initPlugins.tricks.getList()

    // check if the url has filters
    searchFromUrl.checkUrl()

    // listen for showFilters button clicked
    $('.filters-wrap').hide()
    $('.filters-wrap').removeClass('hidden')
    $('.showFilters').click(function(){
      var target = $('.filters-wrap')
      if (target.is(':visible')){
        target.hide()
        $('.spotsFound-wrap').show()
        $(this).html('<i class="fa fa-angle-down" aria-hidden="true"></i> Show filters')
      }else{
        $('.spotsFound-wrap').hide()
        target.show()
        $(this).html('<i class="fa fa-angle-up" aria-hidden="true"></i> Hide filters')
      }
      $(this).text()
    })

    // listen for filters submit
    $('#submit-filters').on('click', function(){
      $.publish('searchBounds')
    })

    // dovrei anche fare una funzione per controllare quando il mouse va sopra uno spot nella lista di sx, perche' in quel caso dovrebbe evidenziare (cambiare icona) il marker corrispettivo nella mappa
    // per farlo dovrei fare una cosa tipo marker.setIcon('icona.png') dove marker e' il marker relativo allo spot che voglio evidenziare
    // https://developers.google.com/maps/documentation/javascript/3.exp/reference#Marker
  }

  var searchFromUrl = {
    checkUrl: function(){
      // get current url
      var url = window.location.href;
      l.debug('url', url)
      // if contains /filter/ then the filtering should be triggered
      if (url.indexOf('/filter/') !== -1){
        var data = JSON.parse(decodeURIComponent(url.split('/filter/')[1]))
        l.debug('found filters on url', data)
        this.populateFilters(data)
      }
    },
    populateFilters: function(data){
      l.debug('window', window);
      // insert address
      if (data.address != '')
        $('#location').val(data.address)
      if (data.rating != '')
        $('#rating').barrating('set', parseInt(data.rating));
      if (data.datetime != '')
        this.setDateTime(data.datetime)
      if (data.tricks != '')
        this.tickTricks(data.tricks)
      if (data.location)
        $.publish('map.setBounds', data.location.bounds)
    },
    setDateTime: function(datetime){
      // get date
      var date = moment(datetime.from).format('YYYY-MM-DD')
      $('#datepicker').val(date)
      // get from time
      var timeFrom = moment(datetime.from).format('HH:mm')
      $('#timepicker-from').val(timeFrom)
      // get to time
      var timeTo = moment(datetime.to).format('HH:mm')
      $('#timepicker-to').val(timeTo)
    },
    tickInterval: false,
    tickTricks: function(tricks){
      l.debug('tickTricks called')
      // i have to check if the ajax tricks loading has finished
      // check if there is at least one trick
      if ($('#tricksList li').length > 0){
        l.debug('tickInterval', this.tickInterval)
        l.debug('numer of tricks found', $('#tricksList li').length)
        if (this.tickInterval){
          l.debug('clearing tickInterval')
          clearInterval(this.tickInterval);
        }
        // set tricks logic
        $('#tricksLogic').val(tricks.logic)
        // check selected tricks
        var tricksArr = tricks.list.split(',')
        tricksArr.forEach(function(trick){
          l.debug('clicking trick', trick)
          $('#' + trick).click();
        })
      }else if (!this.tickInterval){
        var self = this
        this.tickInterval = setInterval(function(){
          self.tickTricks(tricks)
        }, 500)
      }

      
    }
  }

  function spotsFromMap(ev, spotsData){

    l.debug('publishing new spots on page', spotsData.spots)
    l.debug('count spots', spotsData.spots.length)

    // check if any spot has been found and show message
    var nr = spotsData.count
    if (nr > 0){
      $('#spotsFound span').text(nr)
      $('#spotsFound .some').removeClass('hidden')
      if (!$('#spotsFound .none').hasClass('hidden'))
        $('#spotsFound .none').addClass('hidden')
    }else{
      $('#spotsFound .none').removeClass('hidden')
      if (!$('#spotsFound .some').hasClass('hidden'))
        $('#spotsFound .some').addClass('hidden')
    }

    // get handlebars template and compile
    var source   = $("#spot-template").html();
    var template = h.compile(source);
    var spotsHtml = ""

    spotsData.spots.forEach(function(spot){
      // create context and output html
      var context = {
        _id: spot._id,
        name: spot.name,
        formattedAddress: spot.formatted_address,
        description: spot.description,
        tricks: spot.tricks_lookup,
        images: spot.img,
        url: spot._id + '/' + encodeURIComponent(spot.name.replace(' ', '-'))
      };
      l.debug('created spot context', context)
      var html    = template(context);
      spotsHtml += html
    })

    l.debug('updating html with new spots from map')
    $('#spots').html(spotsHtml)

    updatePagination(spotsData.page, spotsData.count);

    // init glide slider
    $(".glide").glide({
        type: "carousel",
        autoheight: true,
        autoplay: false
    });
  }
  $.subscribe('maps.spotsFound', spotsFromMap)

  function updatePagination(page, count){
    l.debug('updatePagination called with', page, count)
    page++; // page 0 will be page 1
    var pages = [];

    var totPages = Math.ceil(count/2)
    var isNotFirst = (page===1)?false:page-1
    var isNotLast = (page===totPages)?false:page+1

    l.debug('updatePagination totPages', totPages)
    l.debug('updatePagination isNotFirst', isNotFirst)
    l.debug('updatePagination isNotLast', isNotLast)

    // max pages nr
    var maxPagination = 4;
    
    if (totPages<maxPagination){
      l.debug('totPages<maxPagination')
      for (var i=1; i<=totPages; i++){
        pages[i] = {
          isActive: (page===i)?true:false,
          target: i,
          page: i
        }
        l.debug('inside cycle pages', pages)
      }
    }else{
      l.debug('totPages>maxPagination')
      // create the bounds around the actual page
      var bounds = Math.floor(maxPagination/2)
      if (page-bounds<1)
        var start = 1
      else if(page+bounds>=totPages)
        var start = totPages-bounds*2
      else if (page-bounds>0)
        var start = page-bounds
      else
        var start = page

      l.debug('pagination starting from', start)

      if (start>=bounds){
        pages.push({
          isActive: false,
          target: 1,
          page: 1
        })
        pages.push({
          isActive: false,
          target: false,
          page: '...'
        })
      }
      // range is start + bounds*2
      for (var i=start; i<start+bounds*2; i++){
        pages.push({
          isActive: (page===i)?true:false,
          target: i,
          page: i
        })
      }
      l.debug('totPages-(start+bounds*2)',totPages-(start+bounds*2))
      if (totPages-(start+bounds*2)>0){
        // 7-(1+2*2)
        pages.push({
          isActive: false,
          target: false,
          page: '...'
        })
        pages.push({
          isActive: false,
          target: totPages,
          page: totPages
        })
      }
      if (totPages-(start+bounds*2)==0){
        // 7-(1+2*2)
        pages.push({
          isActive: isNotLast?false:true,
          target: totPages,
          page: totPages
        })
      }
      
    }

    // get handlebars template and compile
    var source   = $("#pagination-template").html();
    var template = h.compile(source);
    var context = {
      isNotFirst: isNotFirst,
      isNotLast: isNotLast,
      pages: pages
    }
    var html    = template(context);
    $('#pagination').html(html)

  }

  function changePage(page){
    // must get bounds, page, count
    $.publish('searchBounds', page)

    // $.publish('getMapBounds', function(mapBounds){
    //   var limit = 2

    //   // var location = {
    //   //   bounds: map.getBounds().toJSON()
    //   // }
    //   var data = {
    //     location: {
    //       bounds: mapBounds
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
    //       l.info('looking bounds after changePage')
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
    //           $.publish('map.placeMarkers', [res.success.spots])
    //           // placeMarkers(res.success.spots);

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
    // })
  }

  // highlight spot when clicked on the map
  function highlightSpot(ev,id){
    $('.spotDett').removeClass('markerClicked')
    $('#'+id).addClass('markerClicked')
  }
  $.subscribe('map.markerClicked', highlightSpot)

  
  $.material.init()
  init()
  
  l.debug('spots loaded');
})(jQuery)
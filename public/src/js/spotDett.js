// COMMON IMPORTS
import * as common from './common'

import gmaps from './models/gmaps'

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
// slider
import noUiSlider from '../vendor/nouislider/nouislider.js'
import noUiSliderCss from '../vendor/nouislider/nouislider.css'
// d3-c3
import c3Css from '../vendor/c3-master/c3.css'
import c3 from 'c3'
// jquery bar rating
import rating from 'jquery-bar-rating'
import ratingCss from '../vendor/jquery-bar-rating-master/dist/themes/fontawesome-stars.css'

// image lazy loading http://dinbror.dk/blazy/
(function($){
  
  function init(){
    // listen for images click: zoom gallery
    photoswipe.spotDett();
    
    // TRAINING TIME INITS
    // datepicker for training dates
    initPlugins.datepicker();
    // timepicker for training times
    initPlugins.timepicker();
    // rangeslider for training duration
    initPlugins.rangeslider();
    // rating
    initPlugins.rating();

    // listen for trainingtime form submit
    addTrainingTime()
    // 

    // get todays' training schedule
    getTrainingSchedule(moment().format('YYYY-MM-DD'))
    updateTrainingPager(moment().format('YYYY-MM-DD'))
    // listen for training pager
    changeTrainingPager()
  }

  

  var initPlugins = {
    // datepicker
    datepicker: function(){
      var picker = new Pikaday({
        field: $('#datepicker')[0],
        minDate: moment().toDate()
      });
    },
    // timepicker
    // options here http://timepicker.co/options/
    timepicker: function(){
      // get next 30 mins slot
      var minNow = parseInt(moment().format('mm'))
      var timeSlot = (minNow>=30) ? '00' : '30'
      // init timepicker
      $('#timepicker').timepicker({
        timeFormat: 'G:i',
        show2400: true,
        minTime: moment().format('H') + ':' + timeSlot,
        maxTime: '24:00'
      });
    },
    // range slider
    rangeslider: function(){
      var connectSlider = document.getElementById('slider-connect');
      noUiSlider.create(connectSlider, {
        start: 1.5,
        step: 0.25,
        connect: 'lower',
        range: {
          'min': 0.5,
          'max': 6
        },
        format: {
          to: function ( value ) {
            var time = value.toString().split('.')
            var newTime = []
            if (time[0] != 0)
              newTime.push(time[0] + 'h')
            if (time[1])
              newTime.push(floatToTime(time[1]) + 'm')
            return newTime.join(' ')
          },
          from: function ( value ) {
            return value;
          }
        }
      });
      connectSlider.noUiSlider.on('update', function( values, handle ){
        $('#slider-value').html(values[handle])
        $('#slider-input').val(values[handle])
        // (handle ? limitFieldMax : limitFieldMin).innerHTML = values[handle];
      });
    },
    rating: function(){
      $('#rating').barrating({
        theme: 'fontawesome-stars',
        readonly: ($('#rating').data().readonly) ? true : false,
        onSelect:function(value, text, event){
          // if event is null means the onSelect was called from barrating('set', value) on page load
          // in this case the onSelect should be skipped since the user did not proactively select a rating
          if (event){
            var data = {
              id: $('#spotId').val(),
              rating: value
            }
            $.ajax({
              url: '/spot/rating',
              data: data,
              dataType: 'JSON',
              type: 'POST',
              beforeSend: function(){
                l.debug('sending new vote', value)
              },
              success: function(res){
                if (res.error){
                  $.publish('notie', {
                    type: 'error',
                    mess: 'Error while submitting vote'
                  })
                  return
                }
                $.publish('notie', {
                  type: 'info',
                  mess: 'Your rating has been recorded'
                })
              },
              error: function(xh, status, error){
                l.error('error while submitting vote', error)
                $.publish('notie', {
                  type: 'error',
                  mess: 'Error while submitting vote'
                })
              }
            })
          }
        }
      });
      // set initial rating, if found
      var ratingValue = $('#rating').data().mean;
      if (ratingValue)
        $('#rating').barrating('set', parseInt(ratingValue));
    }
  }

  function addTrainingTime(){
    $('#trainingTime').on('submit', function(ev){
      ev.preventDefault();
      // check form errors (date, trainingtime, duration) 
      var datepicker = $('#datepicker').val()
      var timepicker = $('#timepicker').val()
      var slider = $('#slider-input').val()
      if (!datepicker || !timepicker || !slider){
        $.publish('notie', {
          type: 'error',
          mess: 'You have to choose training date, time and duration',
          overlay: true
        })
        return false
      }

      // submit form
      var data = {
        id: $('#spotId').val(),
        datepicker: datepicker,
        timepicker: timepicker,
        slider: slider
      }
      var form = $(this)
      var submitBut = form.find('button[type=submit]')
      var actualVal = submitBut.html() 
      $.ajax({
        url: '/spot/addTrainingTime',
        data: data,
        dataType: 'JSON',
        type: 'POST',
        beforeSend: function(){
          submitBut.html('Please wait <i class="fa fa-circle-o-notch fa-spin"></i>')
        },
        success: function(res){
          if (res.error){
            l.error('error while adding training time:', res.error)
            $.publish('notie', {
              type: 'error',
              mess: 'There was an error while adding training time',
              overlay: true
            })
            submitBut.html(actualVal)
            return
          }
          submitBut.html(actualVal)
          cleanTrainingTime();
          $.publish('notie', {
            type: 'info',
            mess: 'Training time was added succesfully'
          })
        },
        error: function(){
          $.publish('notie', {
            type: 'error',
            mess: 'There was an error while adding training time',
            overlay: true
          })
        }
      })

    })
  }

  var trainingChart, request;
  function getTrainingSchedule(date){
    var id = $('#spotId').val()
    var people = ['persone'];
    var times = ['x']
    $.ajax({
      url: '/spot/groupTraining/' + id + '/' + date + '/',
      data: '',
      type: 'GET',
      dataType: 'JSON',
      beforeSend: function(){
        l.debug('getting training schedule for', date)
      },
      success: function(res){
        if (res.error){
          $.publish('notie', {
            type: 'error',
            mess: 'Error while getting training schedule'
          })
          return
        }
        // qui devo creare il grafico
        var timetable = res.success
        l.debug('timetable is', timetable)
        var max = 0;
        for (var time in timetable){
          var peopleNr = timetable[time]
          people.push(peopleNr)
          times.push(time)
          max = (peopleNr > max) ? peopleNr : max
        }
        // console.log('max people', d3.max(test))
        // if chart does not exist, it must be created
        if (!trainingChart){
          trainingChart = c3.generate({
              bindto: '#chart',
              data: {
                x: 'x',
                xFormat: '%H:%M', // 'xFormat' can be used as custom format of 'x'
                columns: [
                  times,
                  people
                ],
                type: 'area-step'
              },
              axis: {
                x: {
                  type: 'timeseries',
                  tick: {
                    format: '%H:%M',
                    culling: {
                        max: 12 // the number of tick texts will be adjusted to less than this value
                    }
                    // for normal axis, default on
                    // for category axis, default off
                  }
                },
                y: {
                  tick: {
                    format: function (d) {
                      return parseInt(d)
                    },
                    // count: d3.max(peopleTemp)+1
                    count: max+1
                  }
                }
              }
          });
        }else{
          // if chart exist, it must be updated
          trainingChart.load({
            columns: [
              times,
              people
            ],
            // questo unload dava dei risultati strani, non funzionava sempre e poi eliminava l'animazione di passaggio da un grafico del giorno precedente a quello del giorno successivo.
            // ho risolto il problema chiamando questa funzione con un setTimeout (vedere changeTrainingPager)
            // unload: true
          });
        }
        // updateTrainingPager(date)
      },
      error: function(xh, status, error){
        $.publish('notie', {
          type: 'error',
          mess: 'Error while getting training schedule'
        })
      }
    })
  }
  function updateTrainingPager(date){
    $('#training-pager li').removeClass('disabled')
    $('#activeDate').text(date)

    var prevDay = moment(date).subtract(1, 'day').format('YYYY-MM-DD')
    $('#training-pager li').first()
      .data('date', prevDay)
      .find('a')
      .text('← ' + prevDay)

    var nextDay = moment(date).add(1, 'day').format('YYYY-MM-DD')
    $('#training-pager li').last()
      .data('date', nextDay)
      .find('a')
      .text(nextDay + ' →')

    // if today, disable prev
    if (date == moment().format('YYYY-MM-DD'))
      $('#training-pager li').first().addClass('disabled')
    
  }
  function changeTrainingPager(){
    var time;
    $('#training-pager li').on('click', function(ev){
      if (!$(this).hasClass('disabled')){
        l.debug('pager clicked')
        var nextDate = $(this).data().date
        // aggiornamento delle date visualizzate nel training pager
        updateTrainingPager(nextDate)

        // qui uso un timeout altrimenti il trainingchart.load viene chiamato troppe volte e il grafico viene sbagliato perche' accumula i risultati di tutti i giorni (nel caso in cui i pulsanti next/prev vengano premuti velocemente)
        if (time)
          clearTimeout(time)
        time = setTimeout(function(){
          getTrainingSchedule(nextDate)
        },300)
      }
    })
  }

  function cleanTrainingTime(){
    $('#datepicker').val('')
    $('#timepicker').val('')
    var connectSlider = document.getElementById('slider-connect');
    connectSlider.noUiSlider.set(1.5);
    $('#slider-input').val('')
  }

  function floatToTime(float){
    float = parseFloat('0.' + float)
    return (30*float)/0.5
  }

  init();
  $.publish('spotDett.initMap');
  l.debug('spotDett loaded');
})(jQuery)
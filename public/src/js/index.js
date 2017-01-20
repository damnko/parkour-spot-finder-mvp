// COMMON IMPORTS
import * as common from './common'
import theaterjs from 'theaterjs'

// PAGE SPECIFIC


(function($){
  // theater JS setup
  var theater = {
    theater: theaterjs(),
    init: function(){
      this.theater.addActor('io', 0.8, '.teatro')
        .addScene('io: Location', 600)
        .addScene('io: Training dates', 1500)
        .addScene('io: People training there', 1000)
        .addScene('io: Tricks you wanna practice', 1000)
        .addScene('io: Rating', 300)
        .addScene(this.theater.replay)
    }
  }
  
  $.material.init()
  theater.init();
  // $('.container').text('cambiato jquery')
  console.log('index loaded');
  // login.start();
  // notie.alert(1, 'Success!', 1.5);
})(jQuery)
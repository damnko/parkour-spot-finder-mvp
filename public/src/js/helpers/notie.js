import notie from 'notie'
//
// IMPORTANTE
//
// nel modulo di notie (dentro node_modules) ho dovuto commentare una parte che serviva per nascondere la notifica quando veniva premuto il tasto enter o esc perche' faceva in modo che in alcune pagine la notifica appariva e poi spariva immediatamente (cosi velocemente che visivamente non appariva nemmeno)
// la parte commentata e' a riga 107

// ho anche aggiunto un $.publish('notieClicked'); che viene chiamato quando notie viene cliccato, in questo modo posso sapere quando la notifica viene cliccata

module.exports = (function($){
  function notify(ev, info){
    l.debug('notie triggered with', info)
    l.debug('notie triggered with', typeof info)
    var type;
    switch (info.type){
      case 'info':
        type = 1;
        break;
      case 'warning':
        type = 2;
        break;
      case 'error':
        type = 3;
        break;
    }
    var duration = (info.mess.length * 0.05)+1

    if (info.overlay)
      overlay.show(duration)

    notie.alert(type, info.mess, duration)
    
  }

  // overlay to show behind notie message
  var overlay = {
    hasOverlay: false,
    show: function(duration){
      $('.overlay').addClass('show');
      this.hasOverlay= true;
      this.setHideTimeout(duration);
    },
    hideOverlay: function(){
      l.debug('overlay hidden');
      $('.overlay').removeClass('show');
      this.hasOverlay= false;
    },
    hideNow: function(){
      l.debug('notie clicked');
      this.hideOverlay()
      clearTimeout(this.timeout)
    },
    setHideTimeout: function(duration){
      // devo associare la variabile di timeout ad un altro parametro, altrimenti poi non lo riesco a recuperare per farne il clearTimeout per interromperlo eventualmente
      this.timeout = setTimeout(function(){
        l.debug('timeout called');
        this.hideOverlay();
    }.bind(this), duration*1000)},
  }
  
  // devo usare una funzione esterna per chiamare il hideNow() altrimenti mi diceva "hideOverlay is not a function" non so per quale motivo
  function hideOverlay(){
    overlay.hideNow()
  }

  $.subscribe('notieClicked', hideOverlay)
  $.subscribe('notie', notify)
})(jQuery)
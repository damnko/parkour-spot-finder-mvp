// import cookie plugin
// https://github.com/js-cookie/js-cookie
import Cookies from '../../vendor/js-cookie-master/src/js.cookie.js'


module.exports = (function($){
  l.debug('cookies loaded')
  function checkFlash(){
    // check if there are flash messages
    var flash = Cookies.get('flash'); // => undefined
    if (flash){
      l.debug('cookie flash found', flash)
      // short delay before sending the notice
      setTimeout(function(){
        $.publish('notie', JSON.parse(flash))
        Cookies.remove('flash')
      }, 1000)
    }
  }
  
  // every page has to check for flash messages onload
  checkFlash();
  
})(jQuery)
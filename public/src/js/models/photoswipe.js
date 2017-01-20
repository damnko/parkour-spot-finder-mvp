
// reference http://photoswipe.com/

// photoswipe (for image zoom)
import photoSwipeCss from '../../vendor/PhotoSwipe-master/dist/photoswipe.css'
import photoSwipeSkin from '../../vendor/PhotoSwipe-master/dist/default-skin/default-skin.css'
import PhotoSwipe from '../../vendor/PhotoSwipe-master/dist/photoswipe.js'
import PhotoSwipeUI_Default from '../../vendor/PhotoSwipe-master/dist/photoswipe-ui-default.js'

module.exports = (function($){
  function initSpots(){
    // init photoswipe
    $('#spots').on('click', '.glide__slide', function(ev){
      var pswpElement = document.querySelectorAll('.pswp')[0];

      var items = [];
      var index = $(this).parent().find('li:not(.clone)').index( this );

      // get all the items of gallery
      $(this).parent().find('li:not(.clone)').each(function(id,val){
        // get size and img url
        var size = $(this).find('img').data().size.split('x');
        var src = $(this).find('img').attr('src').split('/').pop();

        items.push({
          src: "/images/uploads/fr/" + src,
          w: size[0],
          h: size[1]
        })
      })

      var options = {
          index: index
      };

      // Initializes and opens PhotoSwipe
      var gallery = new PhotoSwipe( pswpElement, PhotoSwipeUI_Default, items, options);
      gallery.init();
    })
  }

  function spotDett(){
    l.debug('listening for clicks on #spotImg')
    $('#spotImg li').on('click', function(ev){
      var pswpElement = document.querySelectorAll('.pswp')[0];

      var items = [];
      var index = $(this).parent().find('li').index( this );

      // get all the items of gallery
      $(this).parent().find('li').each(function(id,val){
        // get size and img url
        var size = $(this).find('img').data().size.split('x');
        var src = $(this).find('img').attr('src').split('/').pop();

        items.push({
          src: "/images/uploads/fr/" + src,
          w: size[0],
          h: size[1]
        })
      })

      var options = {
          index: index
      };

      // Initializes and opens PhotoSwipe
      var gallery = new PhotoSwipe( pswpElement, PhotoSwipeUI_Default, items, options);
      gallery.init();
    })
    

    
  }

  return {
    initSpots: initSpots,
    spotDett: spotDett
  }
})(jQuery)

// CSS imports
// import tokenfieldCSS from '../../vendor/sliptree-bootstrap-tokenfield-9c06df4/dist/css/bootstrap-tokenfield.css'
// import typeaheadCSS from '../../vendor/sliptree-bootstrap-tokenfield-9c06df4/dist/css/tokenfield-typeahead.css'
import tagsinputCSS from '../../vendor/bootstrap-tagsinput-latest/src/bootstrap-tagsinput.css'
import tagsinput from '../../vendor/bootstrap-tagsinput-latest/src/bootstrap-tagsinput.js'


// JS imports
// import tokenfield from '../../vendor/sliptree-bootstrap-tokenfield-9c06df4/js/bootstrap-tokenfield.js'
// import typeahead from '../../vendor/typeahead.bundle.js'

module.exports = (function($){
  l.debug('tokenizer loaded')
  function init(ev, target){
    l.debug('tokenizer initialized')

    /*  TOKENFIELD
    var engine = new Bloodhound({
      datumTokenizer: function(d) {
        return Bloodhound.tokenizers.whitespace(d.name);
      },
      queryTokenizer: Bloodhound.tokenizers.whitespace,
      remote: {
        url: '/interact/tricks/%QUERY.json',
        wildcard: '%QUERY'
      }
    });

    engine.initialize();

    $('#tricks').tokenfield({
      typeahead: [null, {
        display: 'name',
        source: engine.ttAdapter()
      }]
    });
    */

    var tricks = new Bloodhound({
      datumTokenizer: Bloodhound.tokenizers.obj.whitespace('name'),
      queryTokenizer: Bloodhound.tokenizers.whitespace,
      remote: {
        url: '/interact/tricks/%QUERY.json',
        wildcard: '%QUERY'
      }
    });
    tricks.initialize();

    $('#tricks').tagsinput({
      itemValue: '_id',
      itemText: 'name',
      typeaheadjs: {
        name: 'tricks',
        displayKey: 'name',
        source: tricks.ttAdapter()
      }
    });




    // OLD REFERENCE

    // TYPEAHEAD SUGGESTIONS HANDLERS
    // shared with
    /*
    var names = new Bloodhound({
      datumTokenizer: Bloodhound.tokenizers.obj.whitespace('name'),
      queryTokenizer: Bloodhound.tokenizers.whitespace,
      remote: {
        url: '/finance/sharer/%QUERY.json',
        wildcard: '%QUERY'
      }
    });
    $('#nomeCondiviso').typeahead({
      hint: true,
      highlight: true,
      minLength: 1
    },
    {
      name: 'merda',
      display: 'name',
      source: names,
      templates: {
        header: showTooltip,
        notFound: showTooltip
      }
    });
    */

    // OLD
  }

  function spotsInit(ev, tricks){
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
  }
  $.subscribe('merda', spotsInit)
  $.subscribe('tokenfield.init', init)

})(jQuery)
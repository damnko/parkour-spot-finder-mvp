// ####
//
// Login validation
//
// ####

// import form validation
import validateForm from '../helpers/validateForm'

var login = (function($){
  l.debug('Login module loaded')
  
  // These are the constraints used to validate the form
  var constraints = {
    passwordlogin: {
      presence: true
    },
    usernamelogin: {
      presence: true
    }
  }
  
  // Append form validation to loginForm
  $.publish('appendFormValidation', ['loginForm', constraints])

  // function init(){
  //   $('#loginForm').on('submit', function(e){
  //     e.preventDefault();
  //     l.info('login submit');
  //   })
  // }

  // return {
  //   start: init
  // }
})(jQuery)

// HINT: dovrei fare module.exports = login se vorrei esportare qualche funzione (ad es. start())
// module.exports = login
// poi dove chiamo questo modulo tramite import login from './login'
// dovrei fare login.start() per eseguire quella funzione

if (module.hot) {
  module.hot.accept();
}
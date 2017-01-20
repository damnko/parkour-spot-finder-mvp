
// Import form validation
import validateForm from '../helpers/validateForm'

var register = (function($){
  l.debug('Register module loaded')

  // These are the constraints used to validate the form
  var constraints = {
    registeremail: {
      presence: true,
      email: true
    },
    registerusername: {
      presence: true,
      length: {
        minimum: 5
      }
    },
    registerpassword: {
      presence: true,
      length: {
        minimum: 8
      }
    },
    registerprivacy: {
      presence: true
    }
  }
  
  // Append form validation to loginForm
  $.publish('appendFormValidation', ['registerForm', constraints])
})(jQuery)

if (module.hot) {
  module.hot.accept();
}
// import validate plugin
import validate from "validate.js"

var formHandler = (function($){

  // Append listener on form submit
  function init(ev,formID,constraints, precheck){
    l.debug('Listening for form submit')
    $('#' + formID).on('submit', function(e){
      e.preventDefault();
      l.info('Form submit triggered');
      handleFormSubmit(this,constraints, precheck); 
    })
    // append listener on each form field
    // eventualmente fare dopo
  }

  // Form validation and error/success handling
  function handleFormSubmit(form,constraints, precheck){
    // validate the form
    var errors = validate(form, constraints);
    var formElement = $('#' + form.id);
    // if errors, show them
    showErrors(formElement, errors || {});
    // else show success
    if (!errors){
      // questa prima parte serve ad esempio quando si deve fare l'upload di alcune immagini prima dell'invio reale del form, quindi l'invio del form viene fatto solo dopo l'upload delle immagini
      if (precheck){
        l.debug('form with callback found')
        precheck(function(){
          // in realta' qui potrei passare il nome della funzione (dropzone.uploadFinished) come parametro in modo che sia dinamico
          l.debug('unsibscribing from dropzone.uploadFinished and sending form')
          sendForm(formElement);
          $.unsubscribe('dropzone.uploadFinished') // questo in realta' non e' strettamente necessario
        })
      }else{
        l.debug('form witout callback found')
        sendForm(formElement);
      }
    }

    // codice vecchio, veniva usato quando non c'era il file upload handling (dropzone)
    // if (!errors)
    //   sendForm(formElement);
    
  }

  // Clean form from errors
  function cleanForm(form){
    // remove all message errors
    form.find('.form-error').remove()
    form.find('div.alert').addClass('hidden')
    // remove all error classes
    form.find('input, checkbox').removeClass('has-error')
  }

  // Append error classes and messages
  function showErrors(form, errors){
    // publish error presence so other functions/plugins can eventually handle specific errors in different ways (utile ad esempio per il new spot in cui se l'utente non sceglie un posto nella mappa viene emesso un notie)
    $.publish('form.hasErrors', errors)

    cleanForm(form);
    var j = 0;
    for (var error in errors){
      if (j === 0)
        l.warn('Errors in form:', errors)
      j++
      form.find('#' + error).closest('.form-group').addClass('has-error')
      var i = 0;
      while(errors[error][i]){
        form.find('#' + error).parent().append('<span class="text-danger form-error">' + errors[error][i] + '</span>')
        i++
      }
    }
  }

  // Send form to server
  function sendForm(form){
    // grab values
    var values = form.serialize()
    var link = form.attr('action')
    var method = form.attr('method')
    l.debug('Submitting form with: ', values, link, method)

    var submitEl = form.find('[type="submit"]')
    var submitText = submitEl.html()

    $.ajax({
      type: method,
      dataType: 'json',
      data: values,
      url: link,
      beforeSend: function(){
        l.debug('Sending form to server')
        submitEl.html('<i class="fa fa-circle-o-notch fa-spin"></i>')
                .removeClass('btn-primary')
                .addClass('btn-default')
                .prop('disabled', true)
      },
      success: function(res){
        // check for errrors
        if ('errors' in res){
          // show errors
          l.warn('Errors returned from server: ', res.errors)
          showErrors(form, res.errors)
          form.find('div.alert').removeClass('hidden')
          // restore submit button
          restoreSubmit(submitEl, submitText)
        }else if ('critical' in res){
          // show errors
          l.error('Server error: ', res.critical)
          form.find('div.alert strong').html(res.critical)
          form.find('div.alert').removeClass('hidden')
          // restore submit button
          restoreSubmit(submitEl, submitText)
        }else{
          l.info('Form had NO errors, redirecting')
          submitEl.html('<i class="fa fa-check"></i> Redirecting...')
          // redirect to location
          setTimeout(function(){
            // restore submit button
            restoreSubmit(submitEl, submitText)

            // qui metto un cookie che poi viene eventualmente catturato ad ogni pageload ed emette un notie
            // avrei potuto fare (e forse sarebbe stato meglio) questa cosa mettendo lato server req.flash('info','messaggio') e poi recuperare il req.flash dalla route (vedere esempio in /routes/index.js)
            // per ora lascio questo metodo tanto per avere una reference diversa
            if (res.flash)
              Cookies.set('flash', JSON.stringify(res.flash))
            location.assign(res.success.dest);
          }, 1000)
        }
      },
      error: function(xh, status, error){
        l.error('Error in serverside form handling', xh, status, error)
        $.publish('notie', {
          type: 'error',
          mess: 'There was an error during form submission',
          overlay: true
        })
        form.find('div.alert').removeClass('hidden')
        // restore submit button
        restoreSubmit(submitEl, submitText)
      }
    })
  }

  // Restore submit button
  function restoreSubmit(submitEl, submitText){
    submitEl.html(submitText)
            .removeClass('btn-default')
            .addClass('btn-primary')
            .prop('disabled', false)
  }

  // subscribe to event: fire init() on request
  $.subscribe('appendFormValidation', init);

})(jQuery);
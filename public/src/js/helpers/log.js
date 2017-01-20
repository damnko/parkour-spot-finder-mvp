var log = (function(){
  function info(message, ...arg){
    arg.unshift(message)
    console.info.apply(console, arg)
  }
  function warn(message, ...arg){
    arg.unshift('⊗', message)
    console.warn.apply(console, arg)
  }
  function error(message, ...arg){
    arg.unshift('⊗', message)
    console.error.apply(console, arg)
  }
  function debug(message, ...arg){
    arg.unshift('¿', message)
    console.debug.apply(console, arg)
  }
  return{
    info: info,
    error: error,
    debug: debug,
    warn: warn
  }
})();

module.exports = log
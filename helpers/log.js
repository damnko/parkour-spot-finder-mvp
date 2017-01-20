var winston = require('winston');
var nconf = require('nconf').env();

var env = nconf.get('NODE_ENV');

var logger;
// Development usa solo console.log
if (env === 'development'){
  logger = new winston.Logger({
    transports: [
      new (winston.transports.Console)({
       colorize: true,
       level: 'debug'
      })
    ]
  });
}else{
  // Production usa solo file
  logger = new winston.Logger({
    transports: [
      new (winston.transports.File)({
        filename: 'errors.log',
        colorize: false,
        level: 'warning'
      })
    ]
  });
}

module.exports = logger;

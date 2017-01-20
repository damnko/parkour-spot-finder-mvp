var nconf = require('nconf');

// nconf loads the json file first (according to NODE_ENV) and if none is found, gets everythig from env()
nconf.env()
   .file({ file: './config/config.' + nconf.get('NODE_ENV') + '.json' });

module.exports = nconf;
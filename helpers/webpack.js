// Step 1: Create & configure a webpack compiler
var webpack = require('webpack');
var webpackConfig = require(process.env.WEBPACK_CONFIG ? process.env.WEBPACK_CONFIG : '../webpack.config');
var compiler = webpack(webpackConfig);

module.exports.init = function(app){
  // Step 2: Attach the dev middleware to the compiler & the server
  app.use(require("webpack-dev-middleware")(compiler, {
    noInfo: false,
    publicPath: webpackConfig.output.publicPath,
    quiet: false,
    stats: {
      colors: true
    }
  }));

  // Step 3: Attach the hot middleware to the compiler & the server
  app.use(require("webpack-hot-middleware")(compiler, {
    log: console.log,
    path: '/__webpack_hmr',
    // path: 'http://localhost:3000/__webpack_hmr',
    heartbeat: 10 * 1000
  }));
}
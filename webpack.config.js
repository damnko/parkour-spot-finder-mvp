var webpack = require('webpack');
var path = require('path');

var ExtractTextPlugin = require("extract-text-webpack-plugin");
var webpackHotMidlleware = 'webpack-hot-middleware/client?path=/__webpack_hmr&timeout=20000';

// var notifica = require('notie');

module.exports = {
  resolve: {
    alias: {
      handlebars: path.resolve('node_modules/handlebars/dist/handlebars.js'),
      bootstrap: path.resolve('public/src/vendor/bootstrap-3.3.6/dist/js/bootstrap.js'),
      pubsub: path.resolve('public/src/vendor/ba-tiny-pubsub.js'),
      jquery: path.resolve('public/src/vendor/jquery-1.12.1.js'),
      log: path.resolve('public/src/js/helpers/log.js'),
      underscore: path.resolve('node_modules/underscore/underscore.js')
    }
  },
  externals: {
    google: "google"
  },
  // path.resolve e' come fare un cd public/javascripts
  // $.publish('appendFormValidation', ['loginForm', constraints])
  context: path.resolve('public/src/'),
  entry: {
    // webpackHotMidlleware seve solo per far funzionare webpack-dev-middleware, durante la production va tolto
    index: [webpackHotMidlleware, './js/index.js'],
    interact: [webpackHotMidlleware, './js/interact.js'],
    spots: [webpackHotMidlleware, './js/spots.js'],
    spotDett: [webpackHotMidlleware, './js/spotDett.js'],
    vendor: [webpackHotMidlleware, 'bootstrap', 'jquery', 'pubsub'] // mettere jquery qui e' probabilmente superfluo visto che e' gia' dentro la sezione dei "webpack.providePlugin"
  },
  output: {
    path: path.resolve('public/build/'),
    // e' gia' relativa a public essendo la public default in express
    publicPath: '/build/',
    filename: './js/[name].js',
    chunkFilename: "[id].chunk.js"
  },
  // non penso serva questo visto che uso l'expose plugin per jQuery
  // externals: {
  //   '$': 'jquery'
  // },
  module: {
    preloaders: [
      {
        test: /\.js$/,
        exclude: /node_modules/,
        loader: 'jshint-loader'
      }
    ],
    loaders: [
      {
        test: path.resolve('public/src/vendor/jquery-1.12.1.js'),
        loader: "expose?$!expose?jQuery"
      },
      {
        test: path.resolve('public/src/vendor/js-cookie-master/src/js.cookie.js'),
        loader: "expose?Cookies"
      },




      // PROVARE A NON FARE L'EXPOSE DI NOTIE, MA SOLO DI JQUERY E POI CHIAMARE NOTIE TRAMITE IL PUBSUB, PROVARE ANCHE A CHIAMARE UN'ALTRA FUNZIONE DA PUBSUB
      // creare un modulo per il notie che viene incluso in index.js
      // fare il subscribe di questo modulo tramite pubsub
      // chiamare il publish dal footer in handlebars

      // creare un altro modulo che faccia il console.log di una cosa che gli viene passata dal server
      // la funzione avra' solo il console.log, viene messa nel subscribe
      // da handlebars viene chiamato il publish passando l'argomento da printare tramite console.log




      {
        // l'expose-loader e' importante quando devo poter usare un plugin anche nel window.scope quindi ad esempio se devo chiamare un plugin dalla console del browser oppure se lo devo chiamare da una view (quindi usando inline javascript)
        // per fare in modo che funzioni questo script (notie.js) deve essere chiamato/bundlato da qualche parte, in questo caso io l'ho messo insieme ai entry: {vendors: }
        test: path.resolve('node_modules/notie/notie.js'),
        loader: "expose?notie" // qui lo posso rendere disponibile anche con altri nomi facendo "expose?notie!expose?notify"
      },
      {
        test: /\.js$/,
        exclude: /node_modules/,
        loader: 'babel', // 'babel-loader' is also a legal name to reference
        query: {
          presets: ['es2015']
        }
      },
      {
        test: /\.css$/,
        exclude: /node_modules/,
        loader: ExtractTextPlugin.extract("style-loader", "css-loader")
      },
      {
        test: /\.less$/,
        exclude: /node_modules/,
        loader: ExtractTextPlugin.extract("style-loader", "css-loader!less-loader")
      },
      {
        test   : /\.(ttf|eot|svg|woff(2)?)(\?[a-z0-9=\.]+)?$/,
        // forse dovrebbe essere meglio
        // test   : /\.(ttf|eot|svg|woff(2)?)(\?[a-z0-9]+)?$/,
        exclude: /node_modules/,
        loader : 'url-loader?name=font/[name].[hash].[ext]'
      },
      {
        test   : /\.(jpg|png|gif)$/,
        exclude: /node_modules/,
        loader : 'url-loader?limit=10000&name=img/[name].[hash:6].[ext]'
      }
    ],
    /* tolgo questo perche' se non gli faccio fare il parse non mette nemmeno dentro la dipendenza di jquery e quindi non funzionano!
    noParse: [
      /handlebars.\.js$/,
      /bootstrap\.js$/
    ]
    */
  },
  plugins: [
    // questi tre plugins servono per il webpack-dev-middleware e webpack-hot-middleware, da tenere solo in development
      new webpack.optimize.OccurenceOrderPlugin(),
      new webpack.HotModuleReplacementPlugin(),
      new webpack.NoErrorsPlugin(),
    // fa in modo che questi plugin siano disponibili ovunque e possano essere utilizzati quindi senza doverne fare il require, vengono resi disponibili secondo gli "alias" qui definiti, ad es. Handlebars, h, ...
    new webpack.ProvidePlugin({
      h: 'handlebars',
      jQuery: 'jquery',
      $: 'jquery',
      l: 'log',
      _: 'underscore'
    }),
    // viene messo tra i common ogni modulo/plugin chiamato da piu' di 2 file tramite require('nomemodulo o file')
    new webpack.optimize.CommonsChunkPlugin({
      name: 'common',
      minChunks: 2
    }),
    // estrae i css dai file javascript
    new ExtractTextPlugin("css/[name].css")
  ],
  // Disable source maps for now, perche' sono pesanti e rallentano il build iniziale
  // devtool: 'eval-cheap-module-source-map',
    
  profile: true,
  stats: {
      hash: true,
      version: true,
      timings: true,
      assets: true,
      chunks: true,
      modules: true,
      reasons: true,
      children: true,
      source: false,
      errors: true,
      errorDetails: true,
      warnings: true,
      publicPath: true
  }
}

// pagina index deve contenere (in questo ordine)
// common.js + vendor.js + index.js
// pagina cart deve contenere (in questo ordine)
// common.js + vendor.js + cart.js
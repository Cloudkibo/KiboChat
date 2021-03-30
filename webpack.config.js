const path = require('path')
const config = require('./server/config/environment')

module.exports = {
  mode: config.env,
  entry: './server/api/v1.1/shopify/script/index.js',
  devtool: 'inline-source-map',
  output: {
    filename: 'kibo_shopify.build.js',
    path: path.resolve(__dirname, 'server/api/v1.1/shopify/script/dist')
  }
}

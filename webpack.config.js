const path = require('path');
const CopyPlugin = require('copy-webpack-plugin');

module.exports = {
  mode: 'production',
  entry: {
    background: './src/background.js',
    'content/init': './src/content/init.js',
    'popup/popup': './src/popup/popup.js',
    'utils/sendMessageToActiveTab': './src/utils/sendMessageToActiveTab.js'
  },
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: '[name].js',
    clean: true
  },
  plugins: [
    new CopyPlugin({
      patterns: [
        { from: 'src/content/logger.js', to: 'content/' },
        { from: 'src/content/cleanupLogger.js', to: 'content/' },
        { from: 'src/popup/popup.html', to: 'popup/' },
        { from: 'src/popup/popup.css', to: 'popup/' },
        { from: 'manifest.json', to: '.' }
      ]
    })
  ]
};

const path = require('path');
const CopyPlugin = require('copy-webpack-plugin');

module.exports = (env, argv) => {
  const isProduction = argv.mode === 'production';
  
  return {
    mode: argv.mode || 'development',
    entry: {
      background: './src/background.js',
      'content/init': './src/content/init.js',
      'popup/popup': './src/popup/popup.js'
    },
    output: {
      path: path.resolve(__dirname, 'dist'),
      filename: '[name].js',
      clean: !isProduction
    },
    devtool: isProduction ? false : 'cheap-module-source-map',
    optimization: {
      minimize: isProduction,
      usedExports: true,
      sideEffects: false
    },
    performance: {
      hints: isProduction ? 'warning' : false,
      maxEntrypointSize: 512000,
      maxAssetSize: 512000
    },
    plugins: [
      new CopyPlugin({
        patterns: [
          { from: 'src/content/logger.js', to: 'content/' },
          { from: 'src/content/cleanupLogger.js', to: 'content/' },
          { from: 'src/popup/popup.html', to: 'popup/' },
          { from: 'src/popup/popup.css', to: 'popup/' },
          { from: 'manifest.json', to: '.' },
          { from: 'icons', to: 'icons' }
        ]
      })
    ],
    resolve: {
      extensions: ['.js'],
      alias: {
        '@utils': path.resolve(__dirname, 'src/utils'),
        '@content': path.resolve(__dirname, 'src/content'),
        '@popup': path.resolve(__dirname, 'src/popup')
      }
    }
  };
};

const path = require('path');

module.exports = {
  entry: path.resolve(__dirname, 'src/index.ts'),
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'main.js',
    publicPath: 'auto',
    library: {
      type: 'umd',
    },
    clean: true,
  },
  resolve: {
    extensions: ['.ts', '.tsx', '.js', '.jsx'],
    alias: {
      src: path.resolve(__dirname, '../src'),

      '@superset-ui/core': path.resolve(__dirname, '../packages/superset-ui-core/src'),
      '@superset-ui/chart-controls': path.resolve(
        __dirname,
        '../packages/superset-ui-chart-controls/src',
      ),
      '@apache-superset/core': path.resolve(
        __dirname,
        '../packages/superset-core/src',
      ),
    },
  },
  externals: {
    react: 'react',
    'react-dom': 'react-dom',
    lodash: 'lodash',
  },
  module: {
    rules: [
      {
        test: /\.[jt]sx?$/,
        use: {
          loader: 'babel-loader',
          options: {
            configFile: path.resolve(__dirname, 'babel.config.js'),
          },
        },
        exclude: /node_modules/,
      },

      {
        test: /\.css$/i,
        use: ['style-loader', 'css-loader'],
      },

      {
        test: /\.svg$/i,
        oneOf: [
          {
            issuer: /\.[jt]sx?$/,
            use: ['@svgr/webpack'],
          },
          {
            type: 'asset/resource',
          },
        ],
      },

      {
        test: /\.(png|jpg|jpeg|gif|webp)$/i,
        type: 'asset/resource',
      },
    ],
  },
};
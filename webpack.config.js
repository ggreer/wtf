// eslint-disable-next-line @typescript-eslint/no-var-requires
const path = require('path');

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { CleanWebpackPlugin } = require('clean-webpack-plugin');

const buildDir = path.resolve(__dirname, 'dist');

module.exports = {
  entry: './index.ts',
  target: 'node',
  mode: process.env.NODE_ENV === 'production' ? 'production' : 'development',
  module: {
    rules: [
      {
        test: /\.ts$/,
        use: 'ts-loader',
        exclude: /node_modules/,
      },
    ],
  },
  resolve: {
    extensions: [ '.ts', '.js' ],
  },
  output: {
    libraryTarget: 'commonjs',
    filename: 'index.js',
    path: buildDir,
  },
  plugins: [
    new CleanWebpackPlugin(),
  ]
};

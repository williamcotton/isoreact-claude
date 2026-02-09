const path = require('path');
const webpack = require('webpack');

module.exports = (env, argv) => {
  return {
    mode: 'production',
    target: 'node',
    entry: './src/cli/index.tsx',
    output: {
      path: path.resolve(__dirname, 'dist/cli'),
      filename: 'index.js',
      clean: true,
    },
    plugins: [
      new webpack.IgnorePlugin({ resourceRegExp: /^react-devtools-core$/ }),
    ],
    resolve: {
      extensions: ['.ts', '.tsx', '.js', '.jsx'],
      alias: {
        '@shared': path.resolve(__dirname, 'src/shared'),
        '@server': path.resolve(__dirname, 'src/server'),
        '@cli': path.resolve(__dirname, 'src/cli'),
        '@components': path.resolve(__dirname, 'src/components'),
      },
    },
    module: {
      rules: [
        {
          test: /\.tsx?$/,
          use: 'ts-loader',
          exclude: /node_modules/,
        },
        {
          test: /\.css$/,
          use: 'null-loader',
        },
      ],
    },
    // Bundle all dependencies (including ESM-only ones like ink).
    // Node builtins are handled by target: 'node'.
  };
};

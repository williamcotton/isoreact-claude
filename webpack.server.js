const path = require('path');
const nodeExternals = require('webpack-node-externals');

module.exports = (env, argv) => {
  const isDev = argv.mode === 'development';

  return {
    mode: isDev ? 'development' : 'production',
    target: 'node',
    entry: './src/server/index.ts',
    output: {
      path: path.resolve(__dirname, 'dist/server'),
      filename: 'index.js',
      ...(isDev ? {} : { clean: true }),
    },
    devtool: isDev ? 'source-map' : undefined,
    resolve: {
      extensions: ['.ts', '.tsx', '.js', '.jsx'],
      alias: {
        '@shared': path.resolve(__dirname, 'src/shared'),
        '@server': path.resolve(__dirname, 'src/server'),
        '@builder': path.resolve(__dirname, 'src/builder'),
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
    externals: [nodeExternals()],
    optimization: {
      nodeEnv: false,
    },
  };
};

const path = require('path');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const ReactRefreshWebpackPlugin = require('@pmmmwh/react-refresh-webpack-plugin');
const ReactRefreshTypeScript = require('react-refresh-typescript');

module.exports = (env, argv) => {
  const isDev = argv.mode === 'development';

  return {
    mode: isDev ? 'development' : 'production',
    entry: './src/client/index.tsx',
    output: {
      path: path.resolve(__dirname, 'dist/client'),
      filename: isDev ? '[name].js' : '[name].[contenthash:8].js',
      publicPath: isDev ? 'http://localhost:3010/static/' : '/static/',
      ...(isDev ? {} : { clean: true }),
    },
    devtool: isDev ? 'eval-source-map' : undefined,
    resolve: {
      extensions: ['.ts', '.tsx', '.js', '.jsx'],
      alias: {
        '@shared': path.resolve(__dirname, 'src/shared'),
        '@client': path.resolve(__dirname, 'src/client'),
        '@components': path.resolve(__dirname, 'src/components'),
      },
    },
    module: {
      rules: [
        {
          test: /\.tsx?$/,
          use: [
            {
              loader: 'ts-loader',
              options: {
                ...(isDev
                  ? {
                      getCustomTransformers: () => ({
                        before: [ReactRefreshTypeScript()],
                      }),
                      transpileOnly: true,
                    }
                  : {}),
              },
            },
          ],
          exclude: /node_modules/,
        },
        {
          test: /\.css$/,
          use: [
            isDev ? 'style-loader' : MiniCssExtractPlugin.loader,
            'css-loader',
          ],
        },
      ],
    },
    plugins: [
      ...(isDev
        ? [new ReactRefreshWebpackPlugin()]
        : [
            new MiniCssExtractPlugin({
              filename: '[name].[contenthash:8].css',
            }),
          ]),
    ],
    optimization: {
      splitChunks: {
        cacheGroups: {
          vendors: {
            test: /[\\/]node_modules[\\/]/,
            name: 'vendors',
            chunks: 'initial',
          },
        },
      },
    },
    ...(isDev
      ? {
          devServer: {
            port: 3010,
            hot: true,
            headers: {
              'Access-Control-Allow-Origin': '*',
            },
            devMiddleware: {
              writeToDisk: false,
            },
          },
        }
      : {}),
  };
};

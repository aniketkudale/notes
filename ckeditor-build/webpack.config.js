/**
 * @license Copyright (c) 2003-2017, CKSource - Frederico Knabben. All rights reserved.
 * For licensing, see LICENSE.md.
 */

'use strict';

/* eslint-env node */

const path = require('path');
const webpack = require('webpack');
const {bundler, styles} = require('@ckeditor/ckeditor5-dev-utils');
const CKEditorWebpackPlugin = require('@ckeditor/ckeditor5-dev-webpack-plugin');
const BabiliPlugin = require('babel-minify-webpack-plugin');

module.exports = {
  devtool: 'source-map',

  entry: path.resolve(__dirname, 'src', 'ckeditor.js'),

  output: {
    // build to the extension src vendor directory
    path: path.resolve(__dirname, '..', 'src', 'sidebar', 'vendor'),
    filename: 'ckeditor.js',
    libraryTarget: 'umd',
    libraryExport: 'default',
    library: 'ClassicEditor'
  },

  plugins: [
    new CKEditorWebpackPlugin({
      language: 'en'
    }),
    new BabiliPlugin(null, {
      comments: false
    }),
    new webpack.BannerPlugin({
      banner: bundler.getLicenseBanner(),
      raw: true
    })
  ],

  module: {
    rules: [
      {
        test: /\.svg$/,
        use: ['raw-loader']
      },
      {
        test: /\.css$/,
        use: [
          {
            loader: 'style-loader',
            options: {
              singleton: true
            }
          }, {
            loader: 'postcss-loader',
            options: styles.getPostCssConfig({
              themeImporter: {
                themePath: require.resolve('@ckeditor/ckeditor5-theme-lark')
              },
              minify: false
            })
          }
        ]
      }
    ]
  }
};

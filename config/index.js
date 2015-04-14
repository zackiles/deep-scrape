'use strict';

var path = require('path'),
    _ = require('lodash');

if (typeof process.env.NODE_ENV === 'undefined') process.env.NODE_ENV = 'development';

module.exports = {
  env: process.env.NODE_ENV,
  root: path.normalize(__dirname + '/../../..'),
  browserOptions: {
    blockedResources: require('./blocked-resources.json')
  }
};

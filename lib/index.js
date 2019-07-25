'use strict';

const MultiClient = require('./multiclient');
const consts = require('./const');

function multiclient(options = {}) {
  Object.keys(options).forEach(key => options[key] === undefined && delete options[key]);
  options = Object.assign({}, consts.defaultOptions, options);
  return MultiClient(options);
}

module.exports = multiclient;

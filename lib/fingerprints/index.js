'use strict';

var logger = require('../logger'),
    _ = require('lodash'),
    MODULES = {};

function compile(){
  require('fs').readdirSync(__dirname + '/').forEach(function(file) {
    if (file.match(/.+\.js/g) !== null && file !== 'index.js') {
      var name = file.replace('.js', '');
      MODULES[name] = require('./' + file);
    }
  });
}

function getProofs(document){
  if(_.isEmpty(MODULES)) compile();
  var proofs = [];
  _.forOwn(MODULES, function(v, k){
    var proof = v.proof(document);
    if(proof) proofs.push(proof);
  });
  return proofs;
}

module.exports.getProofs = getProofs;
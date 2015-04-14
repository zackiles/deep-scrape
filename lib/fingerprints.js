'use strict';

var logger = require('./logger'),
    path = require('path'),
    _ = require('lodash'),
    fingerPrintsPath = path.resolve(__dirname, '../config/fingerprints'),
    MODULES = {};

function compile(){
  require('fs').readdirSync(fingerPrintsPath).forEach(function(file) {
    if (file.match(/.+\.js/g) !== null) {
      var name = file.replace('.js', '');
      MODULES[name] = require(path.resolve(fingerPrintsPath, file));
    }
  });
}

function getProofs(document){
  if(_.isEmpty(MODULES)) compile();
  var proofs = [];
  _.forOwn(MODULES, function(v, k){
    try {
      var proof = v.proof(document);
      if(proof) proofs.push(proof);
    }catch(ex){
      logger.error('Fingerprint plugin ' + k + ' threw an error, skipping plugin. ERROR', ex.toString() );
    }
  });
  return proofs;
}

module.exports.getProofs = getProofs;

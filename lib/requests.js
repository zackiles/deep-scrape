'use strict';

var _ = require('lodash'),
    restler = require('restler'),
    Promise = require('bluebird');


function single(url, options){
  return new Promise(function (resolve, reject) {
    if(!url) return reject(new Error('No url provided'));
    options = options || {};
    options.method = options.method || 'GET';
    options.rejectUnauthorized = options.rejectUnauthorized || false;

    restler.request(url, options).on('complete', function(results) {
     return results instanceof Error ? reject(results) : resolve(results);
    });

  });
}

function many(urls, options){
  return new Promise(function (resolve, reject) {
    if(!urls || !urls.length) return reject(new Error('A list of urls was not provided'));
    urls = _.uniq(urls);
    var promises = urls.map(function(url){
      return single(url, options);
    });
    Promise.all(promises)
    .spread(function(){
      resolve(Array.prototype.slice.call(arguments));
    }).catch(reject);
  });
}

module.exports = {
  single: single,
  many: many
};

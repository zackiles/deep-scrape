'use strict';

var logger = require('./lib/logger'),
    Browser = require('./lib/browser'),
    scanner = require('./lib/scanner'),
    argv = require('minimist')(process.argv.slice(2));

if(!argv.h && !argv.host) throw new Error('No host was specified with -h');

var cleanUpOnExit = function(){
  Browser.exitAll();
  process.exit(0);
};

process
.on('SIGHUP',  cleanUpOnExit)
.on('SIGINT',  cleanUpOnExit)
.on('SIGQUIT', cleanUpOnExit)
.on('SIGABRT', cleanUpOnExit)
.on('SIGTERM', cleanUpOnExit);

function scanSite(options, cb){
  scanner.scanSite(options).then(function(results){
    cb(null, results);
  }).catch(function(err){
    Browser.exitAll();
    cb(err);
  }).done();
}
function scanPage(options, cb){
  scanner.scanPage(options).then(function(results){
    cb(null, results);
  }).catch(function(err){
    Browser.exitAll();
    cb(err);
  }).done();
}

if(require.main === module){
  var page = (argv.h || argv.host);
  var site = (argv.s || argv.site);
  var handle = function(err, results){
    if(err) throw err;
    process.stdout.write(results.toJSON());
    process.exit(0);
  };

  if(page){
    scanPage(page, handle);
  }else{
    scanSite(site, handle);
  }

}else{
  module.exports = {
    scanPage: scanPage,
    scanSite: scanSite
  };
}

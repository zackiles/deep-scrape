'use strict';

var logger = require('./lib/logger'),
    Browser = require('./lib/browser'),
    scanner = require('./lib/scanner'),
    argv = require('minimist')(process.argv.slice(2));

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

if(require.main === module){

  var page = (argv.h || argv.host);
  var site = (argv.s || argv.site);
  var quiet = (argv.q || argv.quiet);

  var handleSuccess = function(results){
    //logger.info(results.pages.length);
    process.stdout.write(results.toJSON());
    process.exit(0);
  };

  var handleError = function(err){
    Browser.exitAll();
    if(err) logger.error({error: err.toString(), stack: err.stack});
    process.exit(0);
  };

  if(quiet) logger.transports.console.silent = true;

  if(page){
    scanner.scanPage(page).then(handleSuccess).catch(handleError).done();
  }else if(site){
    scanner.scanSite(site).then(handleSuccess).catch(handleError).done();
  }else{
    throw new Error('A host or site was not specified with -s or -h');
  }

}else{
  module.exports = {
    scanPage: scanner.scanPage,
    scanSite: scanner.scanSite
  };
}

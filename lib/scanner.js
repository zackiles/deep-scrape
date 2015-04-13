'use strict';

var Browser = require('./browser'),
    HtmlMetaReport = require('./reports/html-meta'),
    ApplicationReport = require('./reports/application'),
    logger = require('./logger');

function scanUrl(url){
  var browser = new Browser();

  var page = {};

  return browser.openPage(url)
  .then(function(results){
    page = results;
    page.meta = new HtmlMetaReport().report(page);
    page.application = new ApplicationReport().report(page);
    page.application.dependencies.js.forEach(function(i){
      //console.log(i.comments);
      console.log(i.fingerprints);
    });

    return page;
  });
}

module.exports = {
  scanUrl : scanUrl
};

'use strict';

var Browser = require('./browser'),
    HtmlMeta = require('./reports/html-meta'),
    logger = require('./logger');

function scanUrl(url){
  var browser = new Browser();

  return browser.openPage(url).then(function(page){
    page.meta = new HtmlMeta().report(page);
    return page;
  });
}

module.exports = {
  scanUrl : scanUrl
};

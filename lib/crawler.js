'use strict';

var Browser = require('./browser'),
    Promise = require('bluebird'),
    HtmlMetaReport = require('./reports/html-meta'),
    SiteReport = require('./reports/site'),
    ApplicationReport = require('./reports/application'),
    logger = require('./logger'),
    utilities = require('./utilities'),
    Promise = require('bluebird');

module.exports.crawl = function(options){
  return new Promise(function(resolve, reject){

    var siteReport = new SiteReport();
    var applicationReport = new ApplicationReport();
    var links = ['http://liftcannabis.ca', 'http://liftcannabis.ca/cannabinoid-calculator/'];

    var promises = links.map(function(l){
      var browser = new Browser();
      return browser.openPage(l);
    });

    Promise.all(promises).spread(function() {
     resolve(Array.prototype.slice.call(arguments));
    }).catch(reject);

  });
};

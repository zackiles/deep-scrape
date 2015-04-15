'use strict';

var Browser = require('./browser'),
    HtmlMetaReport = require('./reports/html-meta'),
    SiteReport = require('./reports/site'),
    ApplicationReport = require('./reports/application'),
    Crawler = require('./crawler'),
    config = require('../config'),
    logger = require('./logger');

function scanPage(options){
  var browser = new Browser(config.browserOptions);
  var siteReport = new SiteReport();
  var applicationReport = new ApplicationReport();

  return browser.openPage(options)
  .then(function(page){
    page = page.toObject();
    page.meta = new HtmlMetaReport(page).toObject();
    applicationReport.addPage(page);
    siteReport.addPage(page);

    siteReport.addApplication(applicationReport.toObject());

    // clean up the site report a bit for single page calls
    siteReport.application = siteReport.applications[0];
    delete siteReport.applications;
    siteReport.page = siteReport.pages[0];
    delete siteReport.pages;

    return siteReport;
  });
}

function scanSite(site){
  return new Crawler(site).start();
}

module.exports = {
  scanPage: scanPage,
  scanSite: scanSite
};

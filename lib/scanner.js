'use strict';

var Browser = require('./browser'),
    HtmlMetaReport = require('./reports/html-meta'),
    SiteReport = require('./reports/site'),
    ApplicationReport = require('./reports/application'),
    crawler = require('./crawler'),
    logger = require('./logger');

function scanPage(url){
  var browser = new Browser();
  var siteReport = new SiteReport();
  var applicationReport = new ApplicationReport();

  return browser.openPage(url)
  .then(function(page){
    page.meta = new HtmlMetaReport(page).toObject();
    applicationReport.addPage(page);
    siteReport.addPage(page);
    siteReport.application = siteReport.applications[0];
    delete siteReport.applications;
    siteReport.page = siteReport.pages[0];
    delete siteReport.pages;
    return siteReport;
  });
}

function scanSite(url){
  var siteReport = new SiteReport();
  var applicationReport = new ApplicationReport();

  return crawler.crawl(url)
  .then(function(pages){

    pages = pages.map(function(page){
      applicationReport.addPage(page);
      siteReport.addPage(page);
      page.meta = new HtmlMetaReport(page).toObject();
      return page;
    });

    return siteReport;
  });
}

module.exports = {
  scanPage: scanPage,
  scanSite: scanSite
};

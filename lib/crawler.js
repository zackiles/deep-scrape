'use strict';

var Browser = require('./browser'),
    Promise = require('bluebird'),
    BlueBirdQueue = require('bluebird-queue'),
    HtmlMetaReport = require('./reports/html-meta'),
    SiteReport = require('./reports/site'),
    ApplicationReport = require('./reports/application'),
    logger = require('./logger'),
    SiteMapper = require('./sitemapper'),
    _ = require('lodash'),
    config = require('../config');


function Crawler(options){
  options = options || {};

  this.site = options.site;
  if(!this.site.includes('//')) this.site = 'http://' +  this.site;

  this.crawlSitemap = options.crawlSitemap || true;
  this.crawlPageLinks = options.crawlPageLinks || false;

  this.linksCrawled = [];
  this.linksFound = [];

  this.queue = new BlueBirdQueue({
    concurrency: 4,
    onComplete: this._onQueueComplete,
    onError: this._onQueueError
  });

  this.siteReport = new SiteReport();
  this.applicationReport = new ApplicationReport();

  this.onCrawlComplete = function(){};
  this.onCrawlError = function(){};
}

Crawler.prototype.start = function(){
  var self = this;
  new Browser(config.browserOptions).openPage(self.site).then(function(page){
    self._processPage(page);
    if(self.crawlSitemap){
      new SiteMapper(page.url).getSitemapLinks().then(function(links){
        links.forEach(function(l){
          self._addLinkToQueue(l);
        });
      });
    }
  });

  return new Promise(function(resolve, reject){
    self.onCrawlComplete = resolve;
    self.onCrawlError = reject;
  });
};

Crawler.prototype._addLinkToQueue = function(url){
  // have we already crawled this site?
  if(_.includes(this.linksFound, url)) return;
  // don't add the main site to crawl, it gets crawled automatically
  if(url === this.site) return;
  // only crawl sites from the same domain
  if(url.includes(this.site)) {
    logger.trace(`Found link ${url}`);
    this.linksFound.push(url);
    this._crawlPage(url);
  }
};

Crawler.prototype._crawlPage = function(url){
  var browser = new Browser(config.browserOptions);
  var promise = browser.openPage.bind(browser, url);
  this.queue.addNow(promise);
};

Crawler.prototype._processPage = function(page){
  var self = this;
  try {
    if(!self.linksCrawled.length && page.redirectURL){
      logger.trace(`Site redirected. Switching url to ${page.redirectURL}`);
      self.site = page.redirectURL;
    }
    page = page.toObject();
    page.meta = new HtmlMetaReport(page).toObject();
    self.applicationReport.addPage(page);

    self.siteReport.addPage(page);
    self.linksCrawled.push(page.url);

    if(self.crawlPageLinks){
      page.meta.internalLinks.forEach(function(item){
        self._addLinkToQueue(item.url);
      });
    }

  }catch(err){
    self.onError(err);
  }
  return this;
};

Crawler.prototype._onQueueComplete = function(results){
  results.forEach(this._processPage);
  this.onCrawlComplete(this.siteReport.toObject());
};

Crawler.prototype._onQueueError = function(err){
  logger.error('Crawler Error:', err.toString(), 'Stack:', err.stack);
  this.onCrawlError(err);
};

module.exports = Crawler;

'use strict';

var Browser = require('./browser'),
    Promise = require('bluebird'),
    HtmlMetaReport = require('./reports/html-meta'),
    SiteReport = require('./reports/site'),
    ApplicationReport = require('./reports/application'),
    logger = require('./logger'),
    SiteMapper = require('./sitemapper'),
    utilities = require('./utilities'),
    _ = require('lodash'),
    config = require('../config'),
    nodeUrl = require('url'),
    restler = require('restler');


function Crawler(site){
  this.site = site;
  this.siteReport = new SiteReport();
  this.applicationReport = new ApplicationReport();
  this.queue = [];
  this.queueResults = [];
  this.queueMax = 5;
  this.crawlMaxPages = 50;
  this.queueWaitTime = 10000; // ms best not to go below this
  this.onComplete = function(){};
  this._onComplete = function(){
    logger.info(`Crawling finished for ${this.site}. Crawled ${this.queueResults.length||0} pages`);
    this.onComplete(siteReport);
  };
  this.onError = function(){};
  this._onError = function(err){
    logger.error({error: err.toString(), stack: err.stack});
    this.onError(err);
  };

  if(!this.site.includes('//')) this.site = `http://${this.site}`;
}

Crawler.prototype.start = function(){
  var self = this;
  var sitemap = new SiteMapper(self.site);

  sitemap.getSitemapLinks().then(function(r){console.log(r);process.exit();});

  /**var self = this;

  // for the first page kick off a manual fetch and process.
  // everything after that will be crawled automatically with the queue
  new Browser(config.browserOptions)
  .openPage(this.site).then(function(page){
    if(page.redirectURL){
      logger.trace(`Site redirected. Switching url to ${page.redirectURL}`);
      self.site = page.redirectURL;
    }
    self.processPage(page);
  })
  .catch(this.onError);
*/
  return new Promise(this.onComplete, this.onError);
};

Crawler.prototype.hasFinished = function(){
  var result;
  if( (!this.queue || this.queue.length === 0) && this.queueResults.length > 0 ) result = true;
  if(this.crawlMaxPages === this.queueResults.length) result = true;

  if(result === true) this._onComplete();
  return false;
};

Crawler.prototype.isQueueDrainable = function(){
  if(this.queue && this.queue[0]) return true;
  return (!this.hasFinished() && this.queue.length === this.queueMax) ? true : false;
};

Crawler.prototype.queueIncludes = function(link){
  return ( _.includes(this.queue, link) || _.includes(this.queueResults, link) );
};

Crawler.prototype.addToQueue = function(link){
  var self = this;

  // is this already in the queue, or already been processed from the queue?
  if( !self.queueIncludes(link) ){

    // if the queue has reached capacity wait a bit.
    // otherwise add the link to the queue and drain the queue pool if needed.
    if(self.queue.length > self.queueMax){
       setTimeout(function(){
         self.addToQueue(link);
        }, self.queueWaitTime);
        return this;

    }else{
      // add the new link and drain the pool if reached max queued items
      self.queue.push(link);
      if(self.isQueueDrainable()) self.drainQueue();
    }
  }
  return this;
};

Crawler.prototype.drainQueue = function(){
  var self = this;
  var browser = new Browser(config.browserOptions);
  // process the queue in batches. each new Browser instance gets it's
  // own phantom process and cpu. we drain the queue in batches for performance.
  var promises = _.uniq(self.queue).map(function(v){
    return browser.openPage(v);
  });

  Promise.all(promises)
  .each(_.bind(self.processPage, self))
  .catch(self.onError);

  return this;
};

Crawler.prototype.processPage = function(page){
  var self = this;
  try {

    page = page.toObject();
    page.meta = new HtmlMetaReport(page).toObject();
    self.applicationReport.addPage(page);
    self.siteReport.addPage(page);
    self.queueResults.push(page.url);

    page.meta.internalLinks.forEach(function(item){
      // does the link belong to the same domain? (santity check this shouldn't really happen)
      if( item.url.includes(self.site) ) {
        logger.trace(`Found link ${item.url}`);
        self.addToQueue(item.url);
      }
    });

    self.queue = _.remove(self.queue, page.url);

  }catch(err){
    self.onError(err);
  }
  return this;
};


module.exports = Crawler;

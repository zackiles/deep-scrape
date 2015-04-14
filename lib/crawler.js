'use strict';

var Browser = require('./browser'),
    Promise = require('bluebird'),
    HtmlMetaReport = require('./reports/html-meta'),
    SiteReport = require('./reports/site'),
    ApplicationReport = require('./reports/application'),
    logger = require('./logger'),
    utilities = require('./utilities'),
    _ = require('lodash'),
    config = require('../config'),
    nodeUrl = require('url'),
    Promise = require('bluebird');


function Crawler(site){
  this.site = site;
  this.siteReport = new SiteReport();
  this.applicationReport = new ApplicationReport();
  this.queue = [];
  this.queueResults = [];
  this.queueMax = 5;
  this.crawlMax = 50;
  this.onComplete = function(){};
  this.onError = function(){};

  if(!this.site.includes('//')) this.site = `http://${this.site}`;
}

Crawler.prototype.start = function(){
  logger.error(nodeUrl.parse(this.site));
  this.addToQueue(this.site);
  return new Promise(this.onComplete, this.onError);
};

Crawler.prototype.hasFinished = function(){
  if( (!this.queue || this.queue.length === 0) && this.queueResults.length > 0 ) return true;
  if(this.crawlMax === this.queueResults.length) return true;
  return false;
};

Crawler.prototype.isQueueDrainable = function(){
  // drain the queue the for the very first page to start generating links
  if(this.queue[0] && this.queue[0] === this.site) return true;
  var results = (!this.hasFinished() && this.queue.length === this.queueMax) ? true : false;
  return results;
};

Crawler.prototype.addToQueue = function(link){
  var self = this;

  // is this already in the queue, or already been processed from the queue?
  if( !_.includes(self.queue, link) && !_.includes(self.queueResults, link) ){

    // does the link belong to the same domain? (santity check this shouldn't happen)
    if(!link.includes(self.site)) return this;

    // if the queue has reached capacity wait a bit.
    // otherwise add the link to the queue and drain the queue pool if needed.
    if(self.queue.length > self.queueMax){
       setTimeout(function(){
         self.addToQueue(link);
        }, 10000);
        return this;
    }else{
      self.queue.push(link);
      if(self.isQueueDrainable()) self.drainQueue();
    }
  }
  return this;
};

Crawler.prototype.drainQueue = function(){
  var self = this;
  var browser = new Browser(config.browserOptions);
  logger.info('draining queue', self.queue);
  // process the queue in batches. each new Browser instance gets it's
  // own phantom process and cpu. we drain the queue in batches for performance.
  var count = 0;
  self.queue.reduce(function(cur, next){
    return cur.then(function(){
      var link = self.queue[count];
      count ++;
      logger.trace('Adding link to queue, link:', link);
      logger.trace('Current queue:', self.queue);
      logger.trace('Processed items:', self.queueResults);
      if(link) return browser.openPage(link);
    });
  }, Promise.resolve()).then(function(){
      Array.prototype.slice.call(arguments).forEach(function(page){
        if(page && page.url) self.processPage(page);
      });
  });
};

Crawler.prototype.processPage = function(page){
  var self = this;
  try {

    page = page.toObject();
    page.meta = new HtmlMetaReport(page).toObject();
    self.applicationReport.addPage(page);
    self.siteReport.addPage(page);
    self.queueResults.push(page.url);

    page.meta.internalLinks.forEach(function(link){
      self.addToQueue(link.url);
    });

    self.queue = _.remove(self.queue, page.url);

  }catch(err){
    logger.error({error: err.toString(), stack: err.stack});
    self.onError(err);
  }
  return this;
};

module.exports.crawl = function crawl(site){
  return new Crawler(site).start();
};

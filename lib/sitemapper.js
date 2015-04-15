'use strict';

var _ = require('lodash'),
    Promise = require('bluebird'),
    nodeUrl = require('url'),
    robots = require('robots'),
    robotsParser = new robots.RobotsParser(),
    xmlToJs = require('xml2js'),
    logger = require('./logger'),
    requests = require('./requests'),
    utilities = require('./utilities');

function SiteMapper(site){
  if(!site) throw new Error('No site proivded');
  this.site = nodeUrl.parse(site).href;
  this.sitemaps = [];
  this.robots = '';
}

SiteMapper.prototype.getRobotsTxt = function(){
  var self = this;
  return new Promise(function (resolve, reject) {
    if(self.robots) return resolve(self.robots);
    robotsParser.setUrl(nodeUrl.resolve(self.site, 'robots.txt'), function(parser, success) {
      if(!success) {
        logger.trace('No robots.txt found for', self.site);
        return reject();
      }
      self.robots = parser.parse();
      resolve(self.robots);
    });
  });
};

SiteMapper.prototype.getSitemaps = function(){
  var self = this;
  return new Promise(function (resolve, reject) {
    if(self.sitemaps.length) return resolve(self.sitemaps);
    robotsParser.setUrl(nodeUrl.resolve(self.site, 'robots.txt'), function(parser, success) {
      if(!success) {
        logger.trace('No sitemaps found for', self.site);
        return resolve();
      }
      parser.getSitemaps(function(links){
        links = links.map(function(link){
          return nodeUrl.resolve(self.site, link);
        });
        requests.many(links)
        .then(function(sitemaps){
          self.sitemaps = sitemaps;
          resolve(sitemaps);
        })
        .catch(reject);
      });
    });
  });
};

SiteMapper.prototype.getSitemapLinks = function(){
  var self = this;

  var convert = function(sitemaps){
    return new Promise(function (resolve, reject) {
      var promises = sitemaps.map(function(m){
        return SiteMapper.sitemapToLinks(m);
      });
      return Promise.all(promises).spread(function(){
        var links = Array.prototype.slice.call(arguments);
        links = _.uniq(_.flatten(links));
        resolve(links);
      }).catch(reject);
    });
  };

  return new Promise(function (resolve, reject) {
    if(self.sitemaps.length){
      convert(self.sitemaps).then(resolve).catch(reject);
    }else{
      self.getSitemaps().then(convert).then(resolve).catch(reject);
    }
  });
};

SiteMapper.sitemapToLinks = function(sitemap){
  return new Promise(function (resolve, reject) {
    xmlToJs.parseString(sitemap, function(err, xml) {
      if (err) {
        logger.trace('Invalid sitemap xml');
        return resolve();
      }
      var urls = [];
      xml.urlset.url.forEach(function(l) {urls.push(l.loc[0]); });
      resolve(_.uniq(urls));
    });
  });
};

module.exports = SiteMapper;

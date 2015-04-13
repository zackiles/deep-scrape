'use strict';

var cheerio = require('cheerio'),
    _ = require('lodash'),
    utilities = require('../utilities'),
    nodeUrl = require('url');

function HtmlMetaReport(page){

  /**
   * The charset of the document.
   *
   * @property charset
   * @type {String}
   * @default 'utf-8'
   */
  this.charset = 'utf-8';

  /**
   * The size of the document in KB.
   *
   * @property size
   * @type {Integer}
   * @default 0
   */
  this.size = 0;

  /**
   * The H1 or meta title.
   *
   * @property title
   * @type {String}
   * @default ''
   */
  this.title = '';

  /**
   * The meta author or company name extracted from micro formats.
   *
   * @property author
   * @type {String}
   * @default ''
   */
  this.author = '';

  /**
   * A link to a headline image, og image.
   *
   * @property image
   * @type {String}
   * @default ''
   */
  this.image = '';

  /**
   * The meta language.
   *
   * @property language
   * @type {String}
   * @default ''
   */
  this.language = '';


  /**
   * The meta description tag, lead, or main caption.
   *
   * @property description
   * @type {String}
   * @default ''
   */
  this.description = '';

  /**
   * A sample of the main body text of 50 words or less.
   *
   * @property summary
   * @type {String}
   * @default ''
   */
  this.summary = '';

  /**
   * Keywords extracted from the meta keywords element.
   *
   * @property keywords
   * @type {Array}
   * @default ''
   */
  this.keywords = [];

  /**
   * Links pointing to a different domain.
   *
   * @property externalLinks
   * @type {Array}
   * @default []
   */
  this.externalLinks = [];

  /**
   * Links pointing to the same domain.
   *
   * @property internalLinks
   * @type {Array}
   * @default []
   */
  this.internalLinks = [];

  /**
   * Links to RSS or ATOM feeds found.
   *
   * @property internalLinks
   * @type {Array}
   * @default []
   */
  this.feeds = [];

  this._parsePage(page);
}

HtmlMetaReport.prototype._parsePage = function(page){
  var self = this;
  var baseUrl = nodeUrl.parse(page.url);
  var $ = cheerio.load(page.documentRendered, {
    normalizeWhitespace: true,
    xmlMode: true,
    decodeEntities: true
  });
  var charset = $('meta[charset]').attr('charset');
  this.charset = charset || this.charset;
  this.size = Buffer.byteLength(page.documentRendered, 'utf8');
  this.title = getTitle($);
  this.author = getAuthor($);
  this.image = getImage($, baseUrl);
  var language = $('meta[name="language"]').attr('content');
  this.language = language || this.language;
  this.description = getDescription($);
  this.keywords = getKeywords($);
  $('p').each(function(i, el){
    var text = $(el).text();
    if(text.length >= 100) self.summary = utilities.truncateByWords(text, 50);
  });
  $('a').each(function (i, el) {
    var href = $(el).attr('href') || '';
    var absoluteUrl = utilities.canonicalizeUrl(baseUrl, $(el).attr('href'));
    if(href.includes('http') && !href.includes(baseUrl)){
      self.externalLinks.push({
        text: $(el).text().trim(),
        href: href.trim(),
        url: href.trim()
      });
    }else{

      if(absoluteUrl){
        self.internalLinks.push({
          text: $(el).text().trim(),
          href: href.trim(),
          url: absoluteUrl.trim()
        });
      }
    }
  });
  this.feeds = getFeeds($, 'rss').concat(getFeeds($, 'atom'));
  return this;
};

HtmlMetaReport.prototype.toJSON = function(){
  return JSON.stringify(this.toObject());
};

HtmlMetaReport.prototype.toObject = function(){
  return _.cloneDeep(this);
};

function getTitle($){
  var t = utilities.humanize($('title').text());
  if(t) return t;
  t = utilities.humanize($('h1').text());
  if(t) return t;
  t = utilities.humanize($('h2').text());
  if(t) return t;
  return '';
}

function getAuthor($){
  var a = $('meta[name="author"]').attr('content');
  if(a) return utilities.humanize(a);
  a = $('meta[name="publisher"]').attr('content');
  if(a) return utilities.humanize(a);
  a = $('meta[name="creator"]').attr('content');
  if(a) return utilities.humanize(a);
  a = $('[itemtype="http://schema.org/Organization"]').children('[itemprop="name"]').text();
  if(a) return utilities.humanize(a);
  return '';
}

function getImage($, baseUrl){
  var link;
  var i = $('meta[property="og-image"]').attr('content');
  if(i){
    link = utilities.canonicalizeUrl(baseUrl, i);
    return link ? link : i;
  }
  i = $('meta[property="thumbnail"]').attr('content');
  if(i){
    link = utilities.canonicalizeUrl(baseUrl, i);
    return link ? link : i;
  }
  i = $('meta[itemprop="image"]').attr('content');
  if(i){
    link = utilities.canonicalizeUrl(baseUrl, i);
    return link ? link : i;
  }
  return '';
}


function getDescription($){
  var d = utilities.humanize($('meta[name="description"]').attr('content'));
  if(d) return d;
  d = utilities.humanize($('meta[property="og:description"]').attr('content'));
  if(d) return d;
  return '';
}

function getKeywords($){
  var k = $('meta[name="keywords"]').attr('content');
  if(!k) return [];
  return k.split(',').map(Function.prototype.call, String.prototype.trim);
}

function getFeeds($, type){
  var feeds = [];
  $('link[type="application/' + type + '+xml"]').map(function(i ,el){
    feeds.push({
      title: el.attribs.title || '',
      type: el.attribs.type,
      url: el.attribs.href
    });
  });
  return feeds;
}

module.exports = HtmlMetaReport;

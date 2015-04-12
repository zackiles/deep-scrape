'use strict';

var cheerio = require('cheerio'),
    acorn = require('acorn'),
    _ = require('lodash'),
    fingerprints = require('../fingerprints'),
    utilities = require('../utilities');

var domSourcesMatch = new RegExp(/(location\s*[\[.])|([.\[]\s*["']?\s*(arguments|dialogArguments|innerHTML|write(ln)?|open(Dialog)?|showModalDialog|cookie|URL|documentURI|baseURI|referrer|name|opener|parent|top|content|self|frames)\W)|(localStorage|sessionStorage|Database)/g);
var domSinksMatch = new RegExp(/((src|href|data|location|code|value|action)\s*["'\]]*\s*\+?\s*=)|((replace|assign|navigate|getResponseHeader|open(Dialog)?|showModalDialog|eval|evaluate|execCommand|execScript|setTimeout|setInterval)\s*["']]*\s*\()/g);

function ApplicationReport(){

  /**
   * The estimated guess of the CMS, JS framework, or other primary technology.
   *
   * @property name
   * @type {String}
   * @default ''
   */
  this.name = '';

  /**
   * The estimated guess of the CMS, JS framework, or other primary technologies version.
   *
   * @property version
   * @type {String}
   * @default ''
   */
  this.version = '';

  /**
   * The size of the application in KB. This includes html and javascript only.
   *
   * @property size
   * @type {Integer}
   * @default 0
   */
  this.size = 0;


  /**
   * DOM sinks and sources found.
   *
   * @property vectors
   * @type {Object}
   */
  this.vectors = {
    sinks: [],
    sources: []
  };

  /**
   * Application depedencies with fingerprints.
   *
   * @property fingerprint
   * @type {Object}
   */
  this.depedencies = {
    js: [],
    html: [],
    json: []
  };

}

ApplicationReport.prototype.report = function(page){
  var applicationString = '';

  Object.keys(page.resources).map(function(k){
    page.resources[k].forEach(function(r){
      if(r.document) applicationString += r.document.toString().trim();
    });
  });

  this.size = parseFloat((Buffer.byteLength(applicationString, 'utf8') / 1024).toFixed(2));

  this.dependencies = _.pick(page.resources, ['js', 'json', 'html']);
  this.dependencies.js = this.dependencies.js.map(function(d){
    d.comments = getComments(d.document) || [];
    d.fingerprints = fingerprints.getProofs(d.document) || [];
    d.vectors = getVectors(d.document) || [];
    return d;
  });

  return this;
};

function getComments(document){
  var comments = [];
  acorn.parse(document, {
    ranges: true,
    onComment: function(t, c){
      comments.push(c);
    }
  });
  return comments;
}

function getVectors(document){
  var results = {sinks: {count: 0}, sources: {count: 0}};
  results.sinks.highlighted = document.replace(domSinksMatch, function(m){
    results.sinks.count++;
    return 'DOMXSS_SINK_START' + m + 'DOMXSS_END';
  });
  results.sources.highlighted = document.replace(domSourcesMatch, function(m){
    results.sources.count++;
    return 'DOMXSS_SOURCE_START' + m + 'DOMXSS_END';
  });
  return results;
}

module.exports = ApplicationReport;

'use strict';

var  acorn = require('../../node_modules/acorn/dist/acorn_loose'),
    _ = require('lodash'),
    fingerprints = require('../fingerprints'),
    logger = require('../logger'),
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
   * Application dependencies with fingerprints.
   *
   * @property fingerprint
   * @type {Object}
   */
  this.dependencies = {
    html: [],
    js: []
  };

}

ApplicationReport.prototype.addDependency = function(type, dependency){
  try {
    if(!_.isString(type)) throw new Error('No dependency type provided');
    if(_.isEmpty(dependency) || !_.isObject(dependency)) throw new Error('No dependency object provided');
    if(!_.isString(dependency.url)) throw new Error('No dependency url provided');
    dependency.document = _.isString(dependency.document) ? dependency.document : '';
    var hash = utilities.sha1(dependency.method + dependency.url + dependency.document);
    var isNew = _.find(this.dependencies[type], {id: hash}) ? false : true;
    if(isNew) {
      this.size += Buffer.byteLength(dependency.document, 'utf8');
      var newDependency = {
        id: hash,
        url: dependency.url,
        document: dependency.document,
        comments: [],
        fingerprints: [],
        vectors: []
      };
      if(!_.isEmpty(dependency.document)){
        newDependency.comments = getComments(dependency.document) || [];
        newDependency.fingerprints = fingerprints.getProofs(dependency.document) || [];
        newDependency.vectors = getVectors(dependency.document) || [];
      }
      this.dependencies[type].push(newDependency);
    }
  }catch(ex){
    logger.error('Error adding dependency ' + dependency.url);
    throw ex;
  }
  return this;
};

ApplicationReport.prototype.addPages = function(pages){
  pages.forEach(this.addPage);
  return this;
};

ApplicationReport.prototype.addPage = function(page){
  var self = this;
  var resources = _.pick(page.resources, _.keys(this.dependencies));
  _.forOwn(resources, function(v, k){
    _.forEach(v, function(d){
      self.addDependency(k, d);
    });
  });
  return this;
};

ApplicationReport.prototype.toJSON = function(){
  return this.toObject();
};

ApplicationReport.prototype.toObject = function(){
  return _.cloneDeep(this);
};

function getComments(document){
  var comments = [];
  acorn.parse_dammit(document, {
    ranges: true,
    onComment: function(t, c){
      comments.push(c);
    }
  });
  return comments;
}

function getVectors(document){
  var results = {sinks: {count: 0}, sources: {count: 0}};
  results.sinks.tokens = _.uniq(document.match(domSinksMatch));
  results.sinks.highlighted = document.replace(domSinksMatch, function(m){
    results.sinks.count++;
    return 'DOMXSS_SINK_START' + m + 'DOMXSS_END';
  });
  results.sources.tokens = _.uniq(document.match(domSourcesMatch));
  results.sources.highlighted = document.replace(domSourcesMatch, function(m){
    results.sources.count++;
    return 'DOMXSS_SOURCE_START' + m + 'DOMXSS_END';
  });
  return results;
}

module.exports = ApplicationReport;

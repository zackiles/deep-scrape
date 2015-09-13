'use strict';

var _ = require('lodash'),
    nodeUrl = require('url'),
    utilities = require('./utilities');

function Page(page){
  if(!page || !page.url) throw new Error('Page must be initialized with a url');

  var self = this;
  self =  _.merge(self, {
    id: '',
    createdOn: null,
    renderedOn: null,
    url: '',
    urlSanitized: '',
    query: {},
    queryString: '',
    body: {},
    redirectURL: '',
    method: page.method || 'GET',
    blockedResources: [],
    statusText: '',
    status: null,
    document: '',
    documentRendered: '',
    reqHeaders: [],
    resHeaders: [],
    consoleEvents: [],
    promptEvents: [],
    alertEvents: [],
    errorEvents: [],
    application: {},
    meta: {},
    resources: {
      js: [],
      html: [],
      json: [],
      xml: [],
      other: []
    },
    _isLoaded: false,
    _resources: []
  }, page);

  self._populateRequest();
  return self;
}

Page.prototype._populateRequest = function(){
  var self = this;
  var parsed = nodeUrl.parse(self.url);
  if(!parsed.protocol) self.url = 'http://' + self.url;
  parsed = nodeUrl.parse(self.url);

  var urlSanitized = encodeURI(self.url.replace(/%20/g, ' '));
  //html5 push state URLs that have an encoded # (%23) need it to stay encoded
  if(urlSanitized.indexOf('#!') === -1) urlSanitized = urlSanitized.replace(/#/g, '%23');
  self.urlSanitized = urlSanitized;

  self.host = parsed.host || '';
  self.hostname = parsed.hostname || '';
  self.query = parsed.query || {};
  self.queryString = parsed.search || '';
  self.auth = parsed.auth || '';
  self.protocol = parsed.protocol || 'http:';
  self.pathname = parsed.pathname || '';

  self.id = self.id || utilities.sha1(self.method + self.urlSanitized);
};

Page.prototype.toJSON = function(){
  return this.toObject();
};

Page.prototype.toObject = function(){
  this._populateRequest();
  var clone = _.cloneDeep(this);
  delete clone._resources;
  delete clone._isLoaded;

  return clone;
};

module.exports = Page;

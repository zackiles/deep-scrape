'use strict';

var Phantom = require('phantom'),
    phantomJS = require('phantomjs'),
    restler = require('restler'),
    moment = require('moment'),
    Promise = require('bluebird'),
    _ = require('lodash'),
    Page = require('./page'),
    cache = require('./cache'),
    utilities = require('./utilities'),
    logger = require('./logger'),
    npmPackage = require('../package');

var browsers = [];

var phantomConfig = {
  'load-images': 'no',
  'ignore-ssl-errors': 'yes',
  binary: phantomJS.path,
  onStderr: function(msg) {
    logger.error(`phantomjs: ${msg}`);
  },
  onStdOut: function(msg) {
    logger.trace(`phantomjs: ${msg}`);
  },
  onExit: function() {
    logger.trace('phantomjs: exited');
  }
};

function Browser(browserOptions){
  this.browserOptions = browserOptions || {};
  this.browserOptions.site = this.browserOptions.site || '';
  this.browserOptions.cookies = [];
  this.phantom = null;
  this.page = null;
  this.pages = [];
  this.pageInstance = null;
  browsers.push(this);
  return this;
}

Browser.prototype.setupPage = function(page){
  var self = this;

  return new Promise(function (resolve) {

    page.set('onInitialized',           _.bind(self.handleInitialized, self));
    page.set('onPrompt',                _.bind(self.handlePrompt, self));
    page.set('onAlert',                 _.bind(self.handleAlert, self));
    page.set('onResourceReceived',      _.bind(self.handleResourceReceived, self));
    page.set('onResourceTimeout',       _.bind(self.handleResourceTimeout, self));
    page.set('onResourceError',         _.bind(self.handleResourceError, self));
    page.set('onConsoleMessage',        _.bind(self.handleConsoleMessage, self));
    page.set('onNavigationRequested',   _.bind(self.handleNavigationRequested, self));
    page.set('viewportSize',            { width: 1024, height: 800 });
    page.set('onError',                 _.bind(self.handleError, self));

    // handleResourceRequestedCallback is called within PhatomJS
    // and for some reason we can only send a serialized object as an argument.
    page.onResourceRequested(
      Browser.handleResourceRequestedCallback,
      _.bind(self.handleResourceRequested, self),
        self.getBlockedResources()
    );

    page.get('settings.userAgent', function(userAgent){
      userAgent = `${userAgent} ${npmPackage.name} (+ ${npmPackage.repository.url})`;
      page.set('settings.userAgent', userAgent);
      self.pageInstance = page;
      resolve();
    });
  });
};

/**
 * Opens a new Phantom instance.
 *
 * @method createPage
 * @return {Phantom} an object representing a phantom instance with an open tab
 */
Browser.prototype.open = function(){
  var self = this;
  return new Promise(function (resolve, reject) {

    if(self.pageInstance) return resolve();

    var onPhantomCreated = function(phantomInstance){
      self.phantom = phantomInstance;
      self.phantom.set('cookiesEnabled', (self.browserOptions.cookies.length ? true : false));

      self.phantom.createPage(function (page) {
        self.setupPage(page)
          .then(resolve)
          .catch(reject);
      });
    };

    Phantom.create(phantomConfig, onPhantomCreated);
  });
};

/**
 * Creates a new page, opens it, and waits for it to finished loading
 *
 * @method openPage
 * @param {Object} pageOptions page configuration or url string
 * @return parsed Page object
 */
Browser.prototype.openPage = function(pageOptions){
  var self = this;
  // openPage can be called without a url/path as long as browserOptions have a site set
  if(!pageOptions && !self.browserOptions.site) return Promise.reject(new Error('No site url configured and openPage was not called with a url.'));
  // pageOptions can be a string for the url, or a pageOptions object
  if(_.isString(pageOptions)) pageOptions = {url: pageOptions};

  self.page = new Page(pageOptions);

  return new Promise(function (resolve, reject) {
    self.open().then(function(){

      logger.trace(`${self.page.method} @ URL: ${self.page.url} SANITIZED: ${self.page.urlSanitized}`);

      cache.get(self.page.id).then(function(results){
        if(results) {
          self.page = new Page(results);
          self.page._isLoaded = true;
          self.pages.push(self.page);
          return resolve(self.page);
        }

        self.pageInstance.open(self.page.urlSanitized, function (status) {
          self.page.createdOn = moment().toDate();

          utilities.waitForPageToLoad(self.pageInstance, function(){
            self.pageInstance.get('content',function(content){
              self.page.renderedOn = moment().toDate();
              self.page.documentRendered = content;
              self.fetchResource({
                url: self.page.redirectURL || self.page.urlSanitized,
                headers: self.page.headers || {},
                method: self.page.method
              })
              .then(function(results){
                self.page.document = results.document;
                return self.finalize();
              })
              .then(function(results){
                resolve(self.page);
              }).catch(reject);
            });
          });
        });
      }).catch(reject);
    }).catch(reject);
  });
};

/**
 * Closes the current page and free's it's memory in PHantomJS
 *
 * @method close
 * @return undefined
 */
Browser.prototype.close = function(){
  if(this.pageInstance) {
    this.pageInstance.close();
    this.pageInstace = null;
  }
};

/**
 * Closes all page instances on PhantomJS globally
 *
 * @method closeAll
 * @return undefined
 */
Browser.closeAll = function(){
  _.forEach(browsers, function(b){
    b.close();
  });
};

/**
 * Exits the current PhantomJS instance
 *
 * @method exit
 * @return undefined
 */
Browser.prototype.exit = function(){
  if(this.phantom){
    this.close();
    this.phantom.exit();
  }
};

/**
 * Exits all PhantomJS instances globally.
 *
 * @method exitAll
 * @return undefined
 */
Browser.exitAll = function(){
  _.forEach(browsers, function(b){
    b.exit();
  });
};

/**
 *  Gets an array of strings for resources that shouldn't be downloaded.
 *
 * @method getBlockedResources
 * @return {Array} an array of strings
 */
Browser.prototype.getBlockedResources = function(){
  var self = this;
  if(self.page._isLoaded === true) return;
  return self.browserOptions.blockedResources || [];
};

/**
 *  Handles preflight calls in Phantom before a resouce is downloaded.
 *  Ability to abort the request.
 *
 * @method handleResourceRequestedCallback
 * @return undefined
 */
Browser.handleResourceRequestedCallback = function(request, methods, blockedResources){
  for(var i = 0, l = blockedResources.length; i < l; i++) {
    var regex = new RegExp(blockedResources[i], 'gi');
    if(regex.test(request.url)) {
      methods.abort();
      request.aborted = true;
      break;
    }
  }
};

/**
 *  Logs requests that have gone out from the browser
 *  NO ability to abort the request.
 *
 * @method handleResourceRequested
 * @params {Object} request A request object passed from PhantomJS
 * @return undefined
 */
Browser.prototype.handleResourceRequested = function(request){
  var self = this;
  if(request.aborted) return;
  if(self.page._isLoaded === true) return;

  if(utilities.compareUrl(self.page.urlSanitized, request.url)){
    self.page.reqHeaders = request.headers;
  }else{
    self.page._resources.push({
      id: request.id,
      url: request.url,
      reqHeaders: request.headers,
      method: request.method
    });
  }
};

/**
 *  Logs request responses that the browser has received
 *
 * @method handleResourceReceived
 * @params {Object} response A response object passed from PhantomJS
 * @return undefined
 */
Browser.prototype.handleResourceReceived = function(response){
  var self = this;

  if(self.page._isLoaded === true) return;
  if(response.stage !== 'end') return;

  if(response.id === 1){
    self.page.status = response.status;
    self.page.statusText = response.statusText;
    self.page.resHeaders = response.headers;
    self.page.redirectURL = response.redirectURL;
  }else{
    if(!self.page._resources) return;

    var addResponse = function(type){
      var index = utilities.getIndexBy(self.page._resources, 'id', response.id);
      if( index >= 0 ){
        self.page.resources[type].push(
          _.merge({}, self.page._resources[index], {resHeaders: response.headers})
        );
      }
    };

    var type = (response.contentType || '').toLowerCase();

    if( type.includes('javascript') ){
      addResponse('js');
    }else if( type.includes('json') ){
      addResponse('json');
    }else if( type.includes('xml') ){
      addResponse('xml');
    }else if( type.includes('html') ){
      addResponse('html');
    }else{
      addResponse('other');
    }
  }
};

/**
 * Callback fired when the page goes on timeout.
 *
 * @method handleResourceTimeout
 * @return undefined
 */
Browser.prototype.handleResourceTimeout = function(request){
  if(this.page._isLoaded === true) return;
  logger.error(`Resource timeout (# ID: ${request.id}) URL: ${request.url} REQUEST: ${JSON.stringify(request)}`);
};

Browser.prototype.handleResourceError = function(resourceError){
  if(this.page._isLoaded === true) return;
  logger.error(`Resource error (# ID: ${resourceError.id} URL: ${resourceError.url}) CODE: ${resourceError.errorCode} MESSAGE: ${resourceError.errorString}`);
};

/**
 * Callback fired when the page has thrown an error.
 *
 * @method handleError
 * @param {String} message  The error message
 * @param {Array}  trace The stack trace
 * @return undefined
 */
Browser.prototype.handleError = function(message, trace){
  if(this.page._isLoaded === true) return;

  var traces = [];

  if (trace && trace.length) {
    trace.forEach(function (t) {
      traces.push(' -> ' + t.file + ': ' + t.line + (t.function ? ' (in function "' + t.function + '")' : ''));
    });
  }

  this.page.errorEvents.push({
    message: message,
    trace: traces.join('\n')
  });
};

/**
 * Callback invoked when there is a JavaScript prompt on the web page.
 *
 * @method handlePrompt
 * @param {String} message        The string for the message
 * @param {String} defaultVal The default value for the prompt answer
 * @return undefined
 */
Browser.prototype.handlePrompt = function (message, defaultVal) {
  if(this.page._isLoaded === true) return;
  this.page.promptEvents.push({message: message, defaultVal: defaultVal});
};

/**
 * Callback invoked when there is a JavaScript alert on the web page.
 *
 * @method handleAlert
 * @param {String} message The string for the message
 * @return undefined
 */
Browser.prototype.handleAlert = function (message) {
  if(this.page._isLoaded === true) return;
  this.page.alertEvents.push({message: message});
};

/**
 * Callback invoked when there is a JavaScript console message on the web
 * page.
 *
 * @method handleConsoleMessage
 * @param {String}  message      The string for the message
 * @param {Integer} line  The line number
 * @param {String}  source The source identifier
 * @return undefined
 */
Browser.prototype.handleConsoleMessage = function(message, line, source){
  if(this.page._isLoaded === true) return;
  this.page.consoleEvents.push({message: message,line: line || '',source: source || ''});
};

/**
 * Callback invoked after the web page is created but before a URL is
 * loaded.
 *
 * @method handleInitialized
 * @param {Object} page The Page instance
 * @return undefined
 */
Browser.prototype.handleInitialized = function () {
  if(this.page._isLoaded === true) return;
  logger.trace('PhantomJS page initialized');
  /**page.injectJs('../events.js');
  this.pageInstance.evaluate(function() {
    document.addEventListener('DOMContentLoaded', function() {
      console.log('DOM content has loaded.');
    }, false);
  });*/
};

/**
 * Handle the request to change the current URL.
 *
 * @method handleNavigationRequested
 * @param {String} url The target URL of this navigation event
 * @return undefined
 */
Browser.prototype.handleNavigationRequested = function (url) {
  if(this.page._isLoaded === true) return;
  logger.trace(`Browser is navigating to ${url}`);
};

/**
 * Grabs a raw resource without using PhantomJS and with caching.
 *
 * @method fetchResource
 * @return {String} the response body
 */
Browser.prototype.fetchResource = function(resource) {
  var self = this;
  logger.trace(`Fetching resource ${resource.url}`);
  return new Promise(function (resolve, reject) {
    var cacheKey = resource.method + resource.url + self.page.hostname;
    cache.get(cacheKey).then(function(results){
      if(results) return resolve(results);

      restler.get(resource.url, {
        method: resource.method,
        rejectUnauthorized: false,
        headers: resource.headers
      }).on('complete', function(results) {
        if(results instanceof Error) return reject(results);

        resource.document = results;
        cache.set(cacheKey, results).then(function(){
          resolve(resource);
        });
      });
    });
  });
};

/**
 * Grabs multiple raw resource without using PhantomJS and with caching.
 *
 * @method fetchResource
 * @return {String} the response body
 */
Browser.prototype.fetchMultiResource = function (list) {
  var self = this;
  return Promise.all(list.map(self.fetchResource)).spread(function() {
    var fetchedResources = Array.prototype.slice.call(arguments);
    return fetchedResources;
  });
};

/**
 * Finishes up page processing.
 *
 * @method finalize
 * @return undefined
 */
Browser.prototype.finalize = function (url) {
  var self = this;

  return self.fetchMultiResource(self.page.resources.js)
  .then(function(){
    return self.fetchMultiResource(self.page.resources.json);
  })
  .then(function(){
    return self.fetchMultiResource(self.page.resources.xml);
  })
  .then(function(){
    return self.fetchMultiResource(self.page.resources.html);
  })
  .then(function(){
    self.page._isLoaded = true;
    self.pages.push(self.page);

    return cache.set(self.page.id, self.page.toObject());
  });
};


module.exports = Browser;

'use strict';

var logger = require('./logger'),
    S = require('string'),
    truncatise = require('truncatise'),
    crypto = require('crypto'),
    nodeUrl = require('url');

function normalizeUrl(u) {
  return nodeUrl.format(nodeUrl.parse(u, true));
}

function truncateByLength(text, length){
  if(!length) throw new Error('Length not provided.');
  return text ? S(text).truncate(length).s : '';
}

function truncateByWords(text, length, suffix){
  if(!length) throw new Error('Length not provided.');
  if(!text) return '';
  return truncatise(text, {
    TruncateLength: length,
    TruncateBy : "words",
    Strict : false,
    StripHTML : false,
    Suffix : suffix || ''
  });
}

function humanize(text){
  return text ? S(text).humanize().s : '';
}

function compareUrl(u, compare) {
  u = normalizeUrl(u).replace('www.', '').toLowerCase();
  compare = normalizeUrl(compare).replace('www.', '').toLowerCase();
  return u === compare;
}

function canonicalizeUrl(parsedUrl, scrapedHref) {
  if (!scrapedHref || !parsedUrl) return null;
  if (scrapedHref.indexOf('javascript:') === 0) return null;
  if (scrapedHref.indexOf('#') === 0) return null;

  var scrapedUrl = nodeUrl.parse(scrapedHref);
  if (scrapedUrl.host != null) return scrapedHref;
  if (scrapedHref.indexOf('//') === 0) return parsedUrl.protocol + scrapedHref;
  if (scrapedHref.indexOf('/') === 0) return parsedUrl.protocol + '//' + parsedUrl.host + scrapedHref;
  if (scrapedHref.indexOf('(') > 0 && scrapedHref.indexOf(')') > 0) return null;

  var pos = parsedUrl.href.lastIndexOf('/');
  if (pos >= 0) {
    var surl = parsedUrl.href.substring(0, pos + 1);
    return surl + scrapedHref;
  } else {
    return parsedUrl.href + '/' + scrapedHref;
  }
}

function getIndexBy(arr, name, value){
  for (var i = 0; i < arr.length; i++) {
    if (arr[i][name] == value) return i;
  }
  return -1;
}

function waitForPageToLoad(page, callback) {
  var waiting = [],
      interval = 5000,
      timer = setTimeout(timeout, interval),
      max_retry = 3,
      counter_retry = 0;

  bindEvent(page, 'request', function(req) {
    waiting.push(req.id);
  });

  bindEvent(page, 'receive', function(res) {

    if (!res.contentType) return remove(res.id);

    if (res.contentType.indexOf('application') * res.contentType.indexOf('text') !== 0) return remove(res.id);

    if (res.stage === 'end') {
      remove(res.id);
      clearTimeout(timer);
      timer = setTimeout(timeout, interval);
    }

  });

  bindEvent(page, 'error', function(err) {
    remove(err.id);
    if (waiting.length === 0) counter_retry = 0;
  });

  function remove(id) {
    var i = waiting.indexOf(id);
    if (i < 0) return;
    waiting.splice(i, 1);
  }

  function timeout() {
    if (waiting.length && counter_retry < max_retry) {
      timer = setTimeout(timeout, interval);
      counter_retry++;
      return;
    }
    try {
      callback(null, page);
    } catch (err) {logger.error({error: err.toString(), message: err.message, stack: err.stack });}
  }

  function bindEvent(page, evt, cb) {
    switch (evt) {
      case 'request':
        page.onResourceRequested = cb;
        break;
      case 'receive':
        page.onResourceReceived = cb;
        break;
      case 'error':
        page.onResourceError = cb;
        break;
      case 'timeout':
        page.onResourceTimeout = cb;
        break;
    }
  }
}

function sha1(plainText) {
  return crypto.createHash('sha1').update(plainText).digest('hex');
}

function cookiesToString(cookies){
  return _.map(cookies, function(val, key) {
    return key + "=" + encodeURIComponent(val);
  });
}

module.exports = {
  sha1: sha1,
  normalizeUrl: normalizeUrl,
  canonicalizeUrl: canonicalizeUrl,
  cookiesToString: cookiesToString,
  truncateByLength: truncateByLength,
  truncateByWords: truncateByWords,
  humanize: humanize,
  compareUrl: compareUrl,
  getIndexBy: getIndexBy,
  waitForPageToLoad: waitForPageToLoad
};

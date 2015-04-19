'use strict';

var Promise = require('bluebird'),
    _ = require('lodash');


function BlueBirdQueue(options){
  this.concurrency = 4;
  this._queue = [];
  this._queueWaiting = [];
  this._processed = [];
  this._working = false;
  this.onComplete = function(){};
  this.onError = function(){};
}

BlueBirdQueue.prototype.start() = function(func, args){
  return new Promise(this.onComplete, this.onError);
};

BlueBirdQueue.prototype.add = function(func, args){
  this._queue.push( func.bind(null, args) );
  this._deque();
};

BlueBirdQueue.prototype.drain = function(){
  if(!this._queue.length) return;
  try {
    for (i = 0; i < this._queueWaiting.length; i++) {
      clearTimeout(this._queueWaiting[i]);
    }

    this._queueWaiting = [];

    var batches = Math.floor(this._queue.length/this.concurrency);

    if(batches === 0){
      this._working = false;
      this._deque();
    }else{
      for (i = 0; i < batches; i++) {
        this._working = false;
        this._deque();
      }
    }
  }catch(ex){
    self.onError(ex);
  }
};

BlueBirdQueue.prototype._deqeue = function(){
  var self = this;

  try {

    if(self._working === true;){
      self._queueWaiting.push(
        setTimeout(function(){self._deqeue();}, 10000)
      );
      return;
    }

    var promises = [];

    self._working = true;

    for (i = 0; i < self.concurrency; i++) {
      if( self._queue[i] ) promises.push( self._queue.shift()() );
    }

    Promise.all(promises).spread(function(){
      self._working = false;
      self._processed = self._processed.concat(Array.prototype.slice.call(arguments));
      if(!self._queue.length && !self._queueWaiting.length) self.onComplete(self._processed);
    }).catch(self.onError);

  }catch(ex){
    self.onError(ex);
  }
};

module.exports = BlueBirdQueue;

'use strict';

var logger = require('./logger'),
    Promise = require('bluebird'),
    redis = require("redis"),
    redisClient = redis.createClient();

redisClient.on("error", function (err) {
  logger.error("REDIS:", err);
});
redisClient.on("connect", function () {
  logger.trace("REDIS connected");
});

module.exports.get = function(key){
  return new Promise(function(resolve, reject){
    redisClient.get(key, function(err, results){
      return err ? reject(err) : resolve(JSON.parse(results));
    });
  });
};

module.exports.set = function(key, data){
  return new Promise(function(resolve, reject){
    redisClient.set(key, JSON.stringify(data), function(err, results){
      return err ? reject(err) : resolve(results);
    });
  });
};

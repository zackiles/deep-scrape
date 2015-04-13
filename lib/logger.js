'use strict';

var winston = require('winston'),
    logDirectory = './logs',
    fs = require('fs');

if (!fs.existsSync(logDirectory)) {
  fs.mkdirSync(logDirectory);
}

var logger = new winston.Logger({
  transports: [
    new(winston.transports.Console)({
      level: 'verbose',
      handleExceptions: true,
      prettyPrint: true,
      silent: false,
      timestamp: true,
      colorize: true,
      json: false
    }),
    new(winston.transports.DailyRotateFile)({
      name: 'file#info',
      datePattern: '.yyyy-MM-dd',
      level: 'silly',
      json: true,
      prettyPrint: true,
      timestamp: true,
      colorize: false,
      filename: logDirectory + '/info.log',
      maxsize: 1000000,
      maxFiles: 10
    })
  ],
  exceptionHandlers: [
    new(winston.transports.DailyRotateFile)({
      name: 'file#error',
      datePattern: '.yyyy-MM-dd',
      level: 'warn',
      json: true,
      prettyPrint: true,
      timestamp: true,
      colorize: false,
      filename: logDirectory + '/error.log',
      maxsize: 1000000,
      maxFiles: 20
    })
  ]
});

logger.setLevels({
  silly: 0,
  debug: 1,
  verbose: 2,
  trace : 2,
  info: 3,
  warn: 4,
  warning: 4,
  error: 5
});
winston.addColors({
  debug: 'green',
  info: 'cyan',
  silly: 'purple',
  trace: 'magenta',
  verbose: 'magenta',
  warn: 'yellow',
  warning: 'yellow',
  error: 'red'
});

module.exports = logger;

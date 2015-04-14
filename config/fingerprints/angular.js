'use strict';

var application = {
  name: 'angular.js',
  url: 'https://github.com/angular/angular.js',
  description: 'HTML enhanced for web apps http://angularjs.org'
};

module.exports.proof = function proof(document){

  // detect from comments
  if(/AngularJS/im.test(document)){
    var versionRE = new RegExp(/(?:(AngularJS\s))(?:(v))?(?:(\d+)\.)?(?:(\d+)\.)?(?:(\d+)\.\d+)/im);
    var version = document.match(versionRE);
    if(version) application.version = version[0].toLowerCase().replace('angularjs v','');
    return application;
  }
};

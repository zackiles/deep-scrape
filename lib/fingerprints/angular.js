'use strict';

var application = {
  name: 'angular.js',
  url: 'https://github.com/angular/angular.js',
  description: 'HTML enhanced for web apps http://angularjs.org'
};

module.exports.proof = function proof(document){
  if(/angularjs\.org/im.test(document)){
    var vRegEx = new RegExp();
      var re = /^.(\*|\d+(\.\d+){0,2}(\.\*)?)$/;
      var m;
    if ((m = re.exec(document)) !== null) {
        if (m.index === re.lastIndex) {
            re.lastIndex++;
        }
        application.version = m[0];
    }

    return application;
  }
};

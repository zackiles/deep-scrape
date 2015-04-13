'use strict';

var application = {
  name: 'jQuery',
  url: 'https://github.com/jquery/jquery',
  description: 'jQuery JavaScript Library http://jquery.com/'
};

module.exports.proof = function proof(document){

  // detect from comments
  if(/jQuery/im.test(document)){
    var versionRE = new RegExp(/(?:(jQuery\s))(?:(v))?(?:(\d+)\.)?(?:(\d+)\.)?(?:(\d+)\.\d+)/im);
    var version = document.match(versionRE);
    if(version) application.version = version[0].replace('v','');
    return application;
  }
};

'use strict';

var utilities = require('../utilities'),
    _ = require('lodash');

function SiteReport(){

  /**
   * The host. Must be the domain right above the TLD.
   *
   * @property host
   * @type {String}
   * @default ''
   */
  this.host = '';

  /**
   * The hostname. Can be any subdomain of the TLD.
   *
   * @property hostname
   * @type {String}
   * @default ''
   */
  this.hostname = '';

  /**
   * An array of protocols supported by the site.
   *
   * @property protocols
   * @type {Array}
   * @default []
   */
  this.protocols = [];

  /**
   * An array of ApplicationReports.
   *
   * @property applications
   * @type {Array}
   * @default []
   */
  this.applications = [];

  /**
   * An array of Pages.
   *
   * @property pages
   * @type {Array}
   * @default []
   */
  this.pages = [];
}

SiteReport.prototype.addPage = function(page){
  if(this.host){
    if(page.host !== this.host) throw new Error('A page was added that isn\'t from the same host');
  }else{
    this.host = page.host;
  }
  if(this.hostname){
    if(page.hostname !== this.hostname) throw new Error('A page was added that isn\'t from the same hostname');
  }else{
    this.hostname = page.hostname;
  }

  if(!this.protocols.length || !_.includes(this.protocols, page.protocol)) this.protocols.push(page.protocol);

  this.pages.push(page);
  return this;
};

SiteReport.prototype.addApplication = function(applicationReport){
  this.applications.push(applicationReport);
  return this;
};

SiteReport.prototype.toJSON = function(){
  return JSON.stringify(this.toObject());
};

SiteReport.prototype.toObject = function(){
  return _.cloneDeep(this);
};

module.exports = SiteReport;

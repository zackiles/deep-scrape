# Deep Scrape
[![npm version](https://badge.fury.io/js/deep-scrape.svg)](http://badge.fury.io/js/deep-scrape)

Scrape pages with io.js and get a whole lot of meta data. Shows; headers, Ajax requests/responses, rendered html, Javascript AST's, dependencies, console events, and a whole lot more. Crawl sites, or scrape a single page. Add cookies or proxy requests. Fingerprints common javascript libraries, and allows you to write your own.

## Installation

This was tested on io.js 1.6.x. You will likely need that or at least node 0.12.x with ES6 harmony flags.
You can install io.js with [NVM](https://github.com/creationix/nvm) quickly by doing the following:

```sh
// install NVM
curl https://raw.githubusercontent.com/creationix/nvm/v0.24.1/install.sh | bash
nvm install iojs
~/.nvm/nvm.sh
nvm use iojs
```

```sh
npm install deep-scrape
```
## Use Case

- You are scraping websites with lots of javascript (Angular, Ember, Browserfy).
- You don't mind trading a bit of performance for more detailed scraping data.
- You would like to find potential DOM sinks and sources on your pages (Possibly for vulnerability scanning).
- You need the most detailed metadata, metrics, and analyitics on your scraped pages.
- You would like to fingerprint possible technologies a certain site or page uses.



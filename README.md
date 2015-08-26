# Deep Scrape
[![npm version](https://badge.fury.io/js/deep-scrape.svg)](http://badge.fury.io/js/deep-scrape)

Scrape and crawl pages with io.js and get a whole lot of meta data. Shows; headers, Ajax requests/responses, rendered html, Javascript AST's, dependencies, console events, and a whole lot more. Crawl sites, or scrape a single page. Add cookies or proxy requests. Fingerprints common javascript libraries, and allows you to write your own.

## Installation

This was tested on node 0.12.x. It can be run as a module export, or a command line script.
```sh
npm install deep-scrape
// or clone the repository and run it as a script.
```
## Use Case

- You are scraping websites with lots of javascript (Angular, Ember, Browserfy).
- You don't mind trading a bit of performance for more detailed scraping data.
- You would like to find potential DOM sinks and sources on your pages (Possibly for vulnerability scanning).
- You need the most detailed metadata, metrics, and analyitics on your scraped pages.
- You would like to fingerprint possible technologies a certain site or page uses.



const axios = require("axios");
const cheerio = require("cheerio");
const fs = require("fs");
const URL = require("url");
const path = require("path");
const utils = require("./utils.js");
const { resolve } = require("path");

async function downloadWebsite(urlString) {
  const styles = new Map(),
    images = new Map(),
    scripts = new Map(),
    vistedPages = new Map(),
    hostname = URL.parse(urlString).hostname,
    JS_PATH = path.join("sites", hostname, "js"),
    CSS_PATH = path.join("sites", hostname, "css");

  utils
    .createPathIfNotExists(path.join("sites", hostname))
    .then(() => crawl(urlString))
    .catch((err) => console.log(err));

  async function crawl(url) {
    if (vistedPages.has(url)) return vistedPages.get(url);

    const pagePath = path.join("sites", hostname, URL.parse(url).pathname);
    const { data } = await axios.get(url);
    const $ = utils.loadDoc(data),
      pageLinks = utils.getElements("a", $),
      pageStyles = utils.getElements("link[rel=stylesheet]", $),
      pageScripts = utils.getElements("script", $).filter((s) => s.attribs.src);

    const scriptDownloads = utils
      .downloadFiles(
        scripts,
        pageScripts.map(utils.processStatic("src", url, JS_PATH, '.js'))
      )
      .then(utils.updatePaths(pageScripts, "src", pagePath, url));

    const styleDownloads = utils
      .downloadFiles(
        styles,
        pageStyles.map(utils.processStatic("href", url, CSS_PATH, '.css'))
      )
      .then(utils.updatePaths(pageStyles, "href", pagePath, url));

    Promise.all([scriptDownloads, styleDownloads]) //, imageDownloads])
      .then(() => {
        
        // fs.writeFile(
        //   utils.getPageName(pagePath),
        //   $.html(),
        //   (err) => {
        //     if (err) return console.log(err)
        //     vistedPages.set(url, utils.getPageName(pagePath));
        //   }
        // );
      });

    $(pageLinks).each((i, link) => {
      const target = utils.getAbsUrl(target, url);
      if (target.hostname == hostname) crawl(target.href);
    });
  }
}

downloadWebsite("http://localhost:8080/");

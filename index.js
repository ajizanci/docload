const axios = require("axios");
const cheerio = require("cheerio");
const fs = require("fs");
const URL = require("url");
const path = require("path");
const utils = require("./utils.js");
const { resolve } = require("path");

async function downloadWebsite(urlString) {
  // const styles = new Map(),
  //   images = new Map(),
  const scripts = new Map(),
    vistedPages = new Map(),
    hostname = URL.parse(urlString).hostname,
    JS_PATH = path.join("sites", hostname, "js"),
    CSS_PATH = path.join("sites", hostname, "css"),
    IMG_PATH = path.join("sites", hostname, "img");

  utils
    .createPathIfNotExists(path.join("sites", hostname))
    .then(() => crawl(urlString))
    .catch((err) => console.log(err));

  async function crawl(url) {
    if (vistedPages.has(url)) return;

    vistedPages.set(url, true);
    const pagePath = path.join("sites", hostname, URL.parse(url).pathname);
    const { data } = await axios.get(url);
    const $ = cheerio.load(data),
      pageLinks = $("a"),
      styleSelector = $("link[rel=stylesheet]"),
      scriptSelector = $("script"),
      imageSelector = $("img");

    const pageScripts = $(scriptSelector)
      .get()
      .filter((s) => s.attribs.src);

    const scriptDownloads = utils.downloadFiles(
      pageScripts.map(utils.processStatic("src", url, JS_PATH))
    ).then(utils.updatePaths(pageScripts, "src", pagePath, url));

    Promise.all([scriptDownloads]) //, styleDownloads, imageDownloads])
      .then(() => {
        fs.writeFile(utils.getPageName(pagePath), $.html(), err => err && console.log(err))
      });

    $(pageLinks).each((i, link) => {
      const target = utils.getAbsUrl(target, url)
      if (target.hostname == hostname)
        crawl(target.href);
    });
  }
}

downloadWebsite("http://localhost:8080/");

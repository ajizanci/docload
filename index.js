const axios = require("axios");
const fs = require("fs");
const URL = require("url");
const path = require("path");
const utils = require("./utils.js");

function downloadWebsite(urlString) {
  const styles = new Map(),
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
    if (vistedPages.has(url)) return utils.makeMap(url, vistedPages.get(url));

    console.log("Downloading " + url);
    const pagePath = utils.getFileName(
      path.join("sites", hostname, URL.parse(url).pathname),
      path.extname(URL.parse(url).pathname) || ".html",
      "index"
    );
    vistedPages.set(url, pagePath);

    let resp;
    try {
      resp = await axios.get(url);
    } catch {
      return utils.makeMap(url, '')
    }

    const $ = utils.loadDoc(resp.data),
      pageLinks = utils
        .getElements("a", $)
        .filter((l) => l.attribs.href && !l.attribs.href.includes("#")),
      pageStyles = utils.getElements("link[rel=stylesheet]", $),
      pageScripts = utils.getElements("script", $).filter((s) => s.attribs.src);

    const scriptDownloads = utils
      .createPathIfNotExists(JS_PATH)
      .then(() => utils.downloadFiles(
        scripts,
        pageScripts.map(utils.processStatic("src", url, JS_PATH, ".js"))
      ))
      .then(utils.updatePaths(pageScripts, "src", pagePath, url));

    const styleDownloads = utils
      .createPathIfNotExists(CSS_PATH)
      .then(() => utils.downloadFiles(
        styles,
        pageStyles.map(utils.processStatic("href", url, CSS_PATH, ".css"))
      ))
      .then(utils.updatePaths(pageStyles, "href", pagePath, url));

    return Promise.all([scriptDownloads, styleDownloads]) //, imageDownloads])
      .then(() =>
        Promise.all(
          pageLinks
            .filter((l) => l.attribs.href)
            .map((l) => utils.getAbsUrl(l.attribs.href, url))
            .filter((target) => target.hostname == hostname)
            .map((target) => {
              if (vistedPages.has(target.href)) {
                const pathMap = utils.makeMap(
                  target.href,
                  vistedPages.get(target.href)
                );
                return Promise.resolve(pathMap);
              } else {
                return crawl(target.href);
              }
            })
        )
      )
      .then(utils.updatePaths(pageLinks, "href", pagePath, url))
      .then(() => utils.createPathIfNotExists(path.dirname(pagePath)))
      .then(
        () =>
          new Promise((resolve, reject) => {
            fs.writeFile(pagePath, $.html(), (err) => {
              if (err) reject(err);
              else resolve();
            });
          })
      )
      .then(() => {
        console.log(url + " downloaded");
        return utils.makeMap(url, pagePath);
      });
  }
}

downloadWebsite("http://testing-ground.scraping.pro/");

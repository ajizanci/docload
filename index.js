const axios = require("axios");
const fs = require("fs");
const URL = require("url");
const path = require("path");
const utils = require("./utils.js");

async function downloadWebsite(urlString) {
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
    console.log();
    const pagePath = utils.getFileName(
      path.join("sites", hostname, URL.parse(url).pathname),
      ".html",
      "index"
    );
    const { data } = await axios.get(url);
    const $ = utils.loadDoc(data),
      pageLinks = utils.getElements("a", $),
      pageStyles = utils.getElements("link[rel=stylesheet]", $),
      pageScripts = utils.getElements("script", $).filter((s) => s.attribs.src);

    const scriptDownloads = utils
      .downloadFiles(
        scripts,
        pageScripts.map(utils.processStatic("src", url, JS_PATH, ".js"))
      )
      .then(utils.updatePaths(pageScripts, "src", pagePath, url));

    const styleDownloads = utils
      .downloadFiles(
        styles,
        pageStyles.map(utils.processStatic("href", url, CSS_PATH, ".css"))
      )
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
                  visitedPages.get(target.href)
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
        vistedPages.set(url, pagePath);
        console.log(url + " downloaded");
        return utils.makeMap(url, pagePath);
      });
  }
}

downloadWebsite("http://localhost:8080/");

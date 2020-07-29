const axios = require("axios").create({ timeout: 3000 });
const fs = require("fs");
const URL = require("url");
const path = require("path");
const utils = require("./utils.js");

function downloadWebsite(urlString) {
  const styles = new Set(),
    scripts = new Set(),
    visitedPages = new Set(),
    hostname = URL.parse(urlString).hostname,
    JS_PATH = path.join("sites", hostname, "js"),
    CSS_PATH = path.join("sites", hostname, "css");

  async function crawl(url) {
    const urlPath = URL.parse(url).pathname;
    const pagePath = utils.getFileName(
      path.join("sites", hostname, urlPath),
      path.extname(urlPath) || ".html",
      "index"
    );

    if (visitedPages.has(url)) return { [url]: pagePath };

    if (![".html", ".htm", ".php"].includes(path.extname(pagePath)))
      return utils
        .createPathIfNotExists(path.dirname(pagePath))
        .then(() => utils.downloadFile(visitedPages, url, pagePath));

    visitedPages.add(url);

    let resp;
    try {
      resp = await axios.get(url);
    } catch (error) {
      console.log(`Could not get ${url}: ${error.code || error.response.statusText}`)
      return "";
    }

    const $ = utils.loadDoc(resp.data),
      pageLinks = utils.getElements("a", $),
      pageStyles = utils.getElements("link[rel=stylesheet]", $),
      pageScripts = utils.getElements("script", $).filter((s) => s.attribs.src);

    const scriptDownloads = utils.handleStatics({
      pagePath,
      dirPath: JS_PATH,
      url,
      ext: ".js",
      prop: "src",
      elements: pageScripts,
      filesSet: scripts,
    });

    const styleDownloads = utils.handleStatics({
      pagePath,
      dirPath: CSS_PATH,
      url,
      ext: ".css",
      prop: "href",
      elements: pageStyles,
      filesSet: styles,
    });

    return Promise.all([scriptDownloads, styleDownloads]) //, imageDownloads])
      .then(() =>
        utils.crawLinks({
          links: pageLinks,
          url,
          crawler: crawl,
          hostname,
        })
      )
      .then(utils.updatePaths(pageLinks, "href", pagePath, url))
      .then(() => utils.createPathIfNotExists(path.dirname(pagePath)))
      .then(() => utils.writeHtml(pagePath, $.html()))
      .then(() => {
        console.log(url + " downloaded");
        return { [url]: pagePath };
      });
  }

  return utils
    .createPathIfNotExists(path.join("sites", hostname))
    .then(() => crawl(urlString));
}

module.exports = {
  downloadWebsite
}

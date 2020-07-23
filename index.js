const axios = require("axios");
const fs = require("fs");
const URL = require("url");
const path = require("path");
const utils = require("./utils.js");

function downloadWebsite(urlString) {
  const styles = new Map(),
    scripts = new Map(),
    visitedPages = new Map(),
    hostname = URL.parse(urlString).hostname,
    JS_PATH = path.join("sites", hostname, "js"),
    CSS_PATH = path.join("sites", hostname, "css");

  utils
    .createPathIfNotExists(path.join("sites", hostname))
    .then(() => crawl(urlString))
    .catch((err) => console.log(err));

  async function crawl(url) {
    if (visitedPages.has(url)) return utils.makeMap(url, visitedPages.get(url));

    console.log("Downloading " + url);
    const extension = path.extname(URL.parse(url).pathname);
    const pagePath = utils.getFileName(
      path.join("sites", hostname, URL.parse(url).pathname),
      extension || ".html",
      "index"
    );
    visitedPages.set(url, pagePath);
    
    if (extension && ![".html", ".htm"].includes(extension)) {
      return utils
        .createPathIfNotExists(path.dirname(pagePath))
        .then(() => utils.downloadFile(visitedPages, url, pagePath));
    }

    let resp;
    try {
      resp = await axios.get(url);
    } catch {
      return utils.makeMap(url, "");
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
      filesMap: scripts,
    });

    const styleDownloads = utils.handleStatics({
      pagePath,
      dirPath: CSS_PATH,
      url,
      ext: ".css",
      prop: "href",
      elements: pageStyles,
      filesMap: styles,
    });

    return Promise.all([scriptDownloads, styleDownloads]) //, imageDownloads])
      .then(() =>
        utils.crawLinks({
          links: pageLinks,
          url,
          crawler: crawl,
          visitedPages,
          hostname,
        })
      )
      .then(utils.updatePaths(pageLinks, "href", pagePath, url))
      .then(() => utils.createPathIfNotExists(path.dirname(pagePath)))
      .then(() => utils.writeHtml(pagePath, $.html()))
      .then(() => {
        console.log(url + " downloaded");
        return utils.makeMap(url, pagePath);
      });
  }
}

downloadWebsite("http://localhost:8080/");

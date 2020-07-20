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
    hostname = URL.parse(urlString).hostname;

  utils
    .createPathIfNotExists(path.join("sites", hostname))
    .then(() => crawl(urlString))
    .catch((err) => console.log(err));

  async function crawl(url) {
    if (vistedPages.has(url)) return;

    const pagePath = path.join("sites", hostname, URL.parse(url).pathname);
    vistedPages.set(url, true);
    const { data } = await axios.get(url);
    const $ = cheerio.load(data),
      pageLinks = $("a"),
      styleSelector = $("link[rel=stylesheet]"),
      scriptSelector = $("script"),
      imageSelector = $("img");

    const pageScripts = $(scriptSelector)
      .get()
      .filter((s) => s.attribs.src);

    const scriptDownloads = downloadFiles(
      pageScripts.map(processStatic("src", url, path.join("sites", hostname, "js")))
    ).then(updatePaths(pageScripts, "src", pagePath, url));

    Promise.all([scriptDownloads]) //, styleDownloads, imageDownloads])
      .then(() => {
        fs.writeFile(utils.getPageName(pagePath), $.html(), err => err && console.log(err))
      });

    $(pageLinks).each((i, link) => {
      const target = link.attribs.href;
      if (URL.parse(target).hostname == hostname)
        crawl(utils.getAbsUrl(target, url).href);
    });
  }
}

const processStatic = (prop, pageUrl, dirPath) => (static) => {
  const surl = utils.getAbsUrl(static.attribs[prop], pageUrl);
  const spath = path.join(dirPath, surl.pathname);
  return { url: surl.href, path: spath };
};

const updatePaths = (elements, prop, pagePath, pageUrl) => (paths) => {
  const pathMap = paths.reduce(
    (acc, map) => new Map([...acc, ...map]),
    new Map()
  );
  elements.forEach((s) => {
    const scriptPath = pathMap.get(
      utils.getAbsUrl(s.attribs[prop], pageUrl).href
    );
    s.attribs[prop] = path.relative(pagePath, scriptPath);
  });
};

// files -> [{path, url}]
const downloadFiles = (files) =>
  Promise.all(
    files.map(({ path: spath }) =>
      utils.createPathIfNotExists(path.dirname(spath))
    )
  ).then(() =>
    Promise.all(files.map(({ url, path }) => downloadFile(url, path)))
  );

const downloadFile = (url, path) =>
  utils.getFileStream(url).then((readStream) => {
    readStream.pipe(fs.createWriteStream(path));
    const pathMap = new Map();
    pathMap.set(url, path);
    return pathMap;
  });

function downloadPage(urlString) {
  utils
    .createPathIfNotExists(utils.stripProtocolFromUrl(urlString))
    .then(async () => {
      const pageName = getPageName(urlString);

      fs.writeFile(
        pageName,
        (await axios.get(urlString)).data,
        (err) => err && console.log(err)
      );
    })
    .catch((err) => console.log(err));
}

downloadWebsite("http://localhost:8080/");

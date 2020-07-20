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

    vistedPages.set(url, true);
    const { data } = await axios.get(url);
    const $ = cheerio.load(data),
      pageLinks = $("a"),
      //pageStyles = $('link[rel=stylesheet]'),
      scriptSelector = $("script");

    downloadFiles(
      $(scriptSelector)
        .get()
        .filter((s) => s.attribs.src)
        .map((script) => {
          const url = utils.getAbsUrl(script.attribs.src, urlString);
          const spath = path.join("sites", hostname, "js", url.pathname);
          return { url: url.href, path: spath };
        })
    ).then((x) => console.log(x));

    $(pageLinks).each((i, link) => {
      const target = link.attribs.href;

      if (URL.parse(target).hostname == hostname)
        crawl(utils.getAbsUrl(target, urlString).href);
    });
  }
}

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
    return { url, path };
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

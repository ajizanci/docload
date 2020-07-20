const axios = require("axios");
const cheerio = require("cheerio");
const fs = require("fs");
const URL = require("url");
const path = require("path");
const utils = require("./utils.js");

const downloadFile = async (url, path) => {
  const writeStream = fs.createWriteStream(path),
    readStream = await utils.getFileStream(url);

  readStream.pipe(writeStream);
  readStream.on("error", (err) => {
    throw err;
  });
};

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

async function downloadWebsite(urlString) {
  // const styles = new Map(),
  //   images = new Map(),
  const scripts = new Map(),
    vistedPages = new Map(),
    hostname = URL.parse(urlString).hostname;

  utils
    .createPathIfNotExists(path.join("sites", hostname, ""))
    .then(() => crawl(urlString))
    .catch((err) => console.log(err + "HGHGJKGU"));

  async function crawl(url) {
    if (vistedPages.has(url)) return;

    vistedPages.set(url, true);
    const { data } = await axios.get(url);
    const $ = cheerio.load(data),
      pageLinks = $("a"),
      // pageStyles = $('link[rel=stylesheet]'),
      pageScripts = $("script");
    // pageImages = $('img')

    $(pageScripts).each(async (_, script) => {
      if (script.attribs.src && !scripts.has(script.attribs.src)) {
        const scriptUrl = utils.getAbsUrl(script.attribs.src, urlString);
        const scriptPath = path.join(
          "sites",
          hostname,
          "js",
          path.dirname(scriptUrl.pathname)
        );

        utils
          .createPathIfNotExists(scriptPath)
          .then((paths) => {
            scripts.set(scriptUrl.href, scriptPath);
            downloadFile(
              scriptUrl.href,
              path.join(scriptPath, path.basename(scriptUrl.pathname))
            )
              .then(() => {
                $(this).attr(
                  "src",
                  path.relative(
                    utils.stripProtocolFromUrl(urlString),
                    scriptPath
                  )
                );
              })
              .catch((err) => console.log(err));
          })
          .catch((err) => console.log(err));
      }
    });

    $(pageLinks).each((i, link) => {
      const target = link.attribs.href;

      if (URL.parse(target).hostname == hostname)
        crawl(utils.getAbsUrl(target, urlString).href);
    });
  }
}

downloadWebsite("http://localhost:8080/");

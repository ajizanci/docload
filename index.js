const axios = require("axios");
const cheerio = require("cheerio");
const fs = require("fs");
const URL = require("url");
const path = require("path");

const pathExists = (pathString) => {
  return new Promise((resolve, reject) => {
    fs.exists(pathString, (err, exists) => {
      if (err) reject(err);
      else resolve(exists);
    });
  });
};

async function createPathIfNotExists(pathString) {
  if (await pathExists(pathString)) return;

  let pathBuilder = "";
  for (let i = 0; i < pathString.length; i++) {
    pathBuilder += pathString[i];
    if (pathString[i] == "/" && !(await pathExists(pathString))) {
      fs.mkdir(pathBuilder, (err) => err && console.log(err));
    }
  }
}

const getFileStream = async (url) =>
  (await axios.get(url, { responseType: "stream" })).data;

const downloadFile = async (url, path) => {
  const writeStream = fs.createWriteStream(path),
    readStream = await getFileStream(url);

  readStream.pipe(writeStream);
  readStream.on("error", (err) => {
    throw err;
  });
};

const getPageName = (urlString) => {
  if (/\.html$/.test(urlString)) {
    return urlString;
  } else if (urlString[urlString.length - 1] == "/") {
    return urlString + "index.html";
  } else {
    return urlString + ".html";
  }
};

const stripProtocolFromUrl = (urlString) =>
  urlString.slice(urlString.indexOf("//") + 2);

function downloadPage(urlString) {
  createPathIfNotExists(stripProtocolFromUrl(urlString))
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
  const  scripts = new Map(),
    vistedPages = new Map(),
    hostname = URL.parse(urlString).hostname;

  await createPathIfNotExists(path.resolve('test-site', hostname))

  function crawl(url) {
    if (vistedPages.has(url)) return;

    vistedPages.set(url, true);
    const { data } = axios.get(url),
      $ = cheerio.load(data),
      pageLinks = $("a"),
      // pageStyles = $('link[rel=stylesheet]'),
      pageScripts = $("script");
    // pageImages = $('img')

    $(pageScripts).each((i, style) => {
      if (!scripts.has(style.attribs.href)) {
        const stylePath = path.resolve(
          "test-site",
          hostname,
          "js",
          style.attribs.src
        );

        await createPathIfNotExists(stylePath)

        scripts.set(style.attribs.src, stylePath);
        downloadFile(style, stylePath).then(() => {
          $(this).attr(
            "src",
            path.relative(stripProtocolFromUrl(urlString), stylePath)
          );
        });
      }
    });

    $(pageLinks).each((i, link) => {
      const target = link.attribs.href;

      if (URL.parse(target).hostname == hostname) crawl(target);
    });
  }
}
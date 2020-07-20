const axios = require("axios");
const cheerio = require("cheerio");
const fs = require("fs");
const URL = require("url");
const path = require("path");

const pathExists = (pathString) => {
  return new Promise((resolve, reject) => {
    fs.exists(pathString, (exists, err) => {
      if (err) reject(err);
      else resolve(exists);
    });
  });
};

async function createPathIfNotExists(pathString) {
  const dirs = pathString
    .split(path.sep)
    .reduce(
      (acc, dir) => [...acc, path.join(acc[acc.length - 1] || "", dir)],
      []
    );
  const pathExistPromises = dirs.map((path) => pathExists(path));

  return Promise.all(pathExistPromises).then((values) =>
    Promise.all(
      dirs
        .filter((_, i) => !values[i])
        .map(
          (dir) =>
            new Promise((resolve, reject) => {
              fs.mkdir(dir, (err, madedir) => {
                if (err) reject(err);
                else resolve(madedir);
              });
            })
        )
    )
  );
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
  urlString.replace(/(^\w+:|^)\/\//, '');

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
  const scripts = new Map(),
    vistedPages = new Map(),
    hostname = URL.parse(urlString).hostname;

  createPathIfNotExists(path.join("sites", hostname, ""))
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

    $(pageScripts).each(async (i, script) => {
      console.log(script);
      if (!scripts.has(script.attribs.src)) {
        const scriptPath = path.join(
          "sites",
          hostname,
          "js",
          stripProtocolFromUrl(script.attribs.src)
        );

        createPathIfNotExists(scriptPath)
          .then(() => {
            console.log(process.cwd());
            scripts.set(script.attribs.src, scriptPath);
            downloadFile(script.attribs.src, scriptPath).then(() => {
              $(this).attr(
                "src",
                path.relative(stripProtocolFromUrl(urlString), scriptPath)
              );
            }).catch(err => console.log(err));
          })
          .catch((err) => console.log(err));
      }
    });

    $(pageLinks).each((i, link) => {
      const target = link.attribs.href;

      if (URL.parse(target).hostname == hostname) crawl(target);
    });
  }
}

downloadWebsite("http://localhost:8080/");

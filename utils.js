const cheerio = require("cheerio");
const axios = require("axios");
const fs = require("fs");
const { URL } = require("url");
const path = require("path");

const pathExists = (pathString) => {
  return new Promise((resolve, reject) => {
    fs.exists(pathString, (exists, err) => {
      if (err) reject(err);
      else resolve(exists);
    });
  });
};

const getAbsUrl = (rel, base) => {
  return new URL(rel, base)
}

function createPathIfNotExists(pathString) {
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
              console.log("Creating " + dir + " ...")
              fs.mkdir(dir, (err) => {
                if (err) reject(err);
                else {
                  console.log("Created " + dir)
                  resolve(dir);
                }
              });
            })
        )
    )
  );
}

const loadDoc = html => cheerio.load(html)

const getElements = (query, doc) => doc(doc(query)).get()

const getFileStream = async (url) =>
  (await axios.get(url, { responseType: "stream" })).data;

const getFileName = (pagePath, ext) => {
  if (path.extname(pagePath) == ext)
    return pagePath;

  return pagePath + ext;
};

const stripProtocolFromUrl = (urlString) =>
  urlString.replace(/(^\w+:|^)\/\//, '');

const processStatic = (prop, pageUrl, dirPath, ext) => (static) => {
  const surl = getAbsUrl(static.attribs[prop], pageUrl);
  const spath = path.join(dirPath, getFileName(path.basename(surl.pathname), ext));
  return { url: surl.href, path: spath };
};

const updatePaths = (elements, prop, pagePath, pageUrl) => (paths) => {
  const pathMap = paths.reduce(
    (acc, map) => new Map([...acc, ...map]),
    new Map()
  );
  elements.forEach((s) => {
    const staticPath = pathMap.get(
      getAbsUrl(s.attribs[prop], pageUrl).href
    );
    s.attribs[prop] = path.relative(pagePath, staticPath);
  });
};

// files -> [{path, url}]
const downloadFiles = (filesMap, files) =>
  Promise.all(
    files.map(({ path: spath }) =>
      createPathIfNotExists(path.dirname(spath))
    )
  ).then(() =>
    Promise.all(files.map(({ url, path }) => downloadFile(filesMap, url, path)))
  );

function downloadFile(filesMap, url, path) {
  if (filesMap.has(url)) {
    const pathMap = new Map();
    pathMap.set(url, filesMap.get(url));
    return Promise.resolve(pathMap)
  }

  return getFileStream(url).then((readStream) => {
    const writeStream = fs.createWriteStream(path);
    readStream.pipe(writeStream);

    console.log("Downloading " + url + " ...")
    writeStream.on('finish', () => console.log(url + " downloaded."))

    const pathMap = new Map();
    pathMap.set(url, path);
    filesMap.set(url, path);
    return pathMap;
  });
}

module.exports = {
    stripProtocolFromUrl,
    createPathIfNotExists,
    getAbsUrl,
    processStatic,
    downloadFiles,
    updatePaths,
    loadDoc,
    getElements,
}

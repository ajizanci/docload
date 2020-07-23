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
  return new URL(rel, base);
};

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
              console.log("Creating " + dir + " ...");
              fs.mkdir(dir, (err) => {
                if (err && err.code != 'EEXIST') {
                  reject(err)
                } else {
                  console.log("Created " + dir);
                  resolve(dir);
                }
              });
            })
        )
    )
  );
}

const loadDoc = (html) => cheerio.load(html);

const getElements = (query, doc) => doc(doc(query)).get();

const getFileStream = async (url) =>
  (await axios.get(url, { responseType: "stream" })).data;

const getFileName = (pagePath, ext, defaultName) => {
  if (path.extname(pagePath) == ext) return pagePath;

  return path.join(pagePath, defaultName + ext);
};

const makeMap = (key, value) => new Map().set(key, value);

const processStatic = (prop, pageUrl, dirPath, ext) => (static) => {
  const surl = getAbsUrl(static.attribs[prop], pageUrl);
  const defaultName = surl.pathname
    .split("/")
    .filter((p) => p)
    .join("-");
  const spath = path.join(
    dirPath,
    getFileName(path.basename(surl.pathname), ext, defaultName)
  );
  return { url: surl.href, path: spath };
};

const updatePaths = (elements, prop, pagePath, pageUrl) => (paths) => {
  const pathMap = paths.reduce(
    (acc, map) => new Map([...acc, ...map]),
    new Map()
  );
  elements.forEach((s) => {
    const staticPath = pathMap.get(getAbsUrl(s.attribs[prop], pageUrl).href);
    s.attribs[prop] = staticPath
      ? path.relative(path.dirname(pagePath), staticPath)
      : "#";
  });
};

// files -> [{path, url}]
const downloadFiles = (filesMap, files) =>
  Promise.all(
    files.map(({ path: spath }) => createPathIfNotExists(path.dirname(spath)))
  ).then(() =>
    Promise.all(files.map(({ url, path }) => downloadFile(filesMap, url, path)))
  );

function downloadFile(filesMap, url, path) {
  if (filesMap.has(url)) {
    const pathMap = makeMap(url, filesMap.get(url));
    return Promise.resolve(pathMap);
  }

  return getFileStream(url).then((readStream) => {
    const writeStream = fs.createWriteStream(path);
    readStream.pipe(writeStream);

    console.log("Downloading " + url + " ...");
    writeStream.on("finish", () => console.log(url + " downloaded."));
    filesMap.set(url, path);

    return makeMap(url, path);
  });
}

module.exports = {
  createPathIfNotExists,
  getAbsUrl,
  processStatic,
  downloadFiles,
  updatePaths,
  loadDoc,
  getElements,
  getFileName,
  makeMap,
};

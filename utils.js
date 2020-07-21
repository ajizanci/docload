
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
              fs.mkdir(dir, (err) => {
                if (err) reject(err);
                else resolve(dir);
              });
            })
        )
    )
  );
}

const getFileStream = async (url) =>
  (await axios.get(url, { responseType: "stream" })).data;

const getPageName = (pagePath) => {
  if (/\.html$/.test(pagePath)) {
    return pagePath;
  } else {
    return path.join(pagePath, "index.html");
  }
};

const stripProtocolFromUrl = (urlString) =>
  urlString.replace(/(^\w+:|^)\/\//, '');

const processStatic = (prop, pageUrl, dirPath) => (static) => {
  const surl = getAbsUrl(static.attribs[prop], pageUrl);
  const spath = path.join(dirPath, path.basename(surl.pathname));
  return { url: surl.href, path: spath };
};

const updatePaths = (elements, prop, pagePath, pageUrl) => (paths) => {
  const pathMap = paths.reduce(
    (acc, map) => new Map([...acc, ...map]),
    new Map()
  );
  elements.forEach((s) => {
    const scriptPath = pathMap.get(
      getAbsUrl(s.attribs[prop], pageUrl).href
    );
    s.attribs[prop] = path.relative(pagePath, scriptPath);
  });
};

// files -> [{path, url}]
const downloadFiles = (files) =>
  Promise.all(
    files.map(({ path: spath }) =>
      createPathIfNotExists(path.dirname(spath))
    )
  ).then(() =>
    Promise.all(files.map(({ url, path }) => downloadFile(url, path)))
  );

const downloadFile = (url, path) =>
  getFileStream(url).then((readStream) => {
    readStream.pipe(fs.createWriteStream(path));
    const pathMap = new Map();
    pathMap.set(url, path);
    return pathMap;
  });

module.exports = {
    getFileStream,
    stripProtocolFromUrl,
    getPageName,
    createPathIfNotExists,
    getAbsUrl,
    processStatic,
    downloadFiles,
    updatePaths,
}

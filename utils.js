
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

const getAbsUrl = (rel, base) => new URL(rel, base)

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

module.exports = {
    getFileStream,
    stripProtocolFromUrl,
    getPageName,
    createPathIfNotExists,
    getAbsUrl,
}

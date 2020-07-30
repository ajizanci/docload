const fs = require("fs");
const URL = require("url");
const path = require("path");
const Apify = require("apify");
const utils = require("./utils.js");
const { request } = require("http");

async function downloadWebsite(url) {
  const requestQueue = await Apify.openRequestQueue();
  const hostname = URL.parse(url).hostname;
  const websitePath = path.join("sites", hostname);
  const stylesSet = new Set();
  const scriptsSet = new Set();

  await requestQueue.addRequest({ url });

  const crawler = new Apify.CheerioCrawler({
    requestQueue,
    additionalMimeTypes: ["application/pdf"],
    handlePageFunction: async ({ request, $, contentType }) => {
      console.log(request.url, request.loadedUrl, contentType);
      const filePath = utils.getFileName(
        path.join(websitePath, URL.parse(request.loadedUrl).path),
        "." + contentType.type.split("/")[1],
        "index"
      );

      if (contentType.type == "text/html") {
        await utils.handleStatics({
          filesSet: stylesSet,
          dirPath: path.join(websitePath, "css"),
          ext: ".css",
          pagePath: filePath,
          elements: utils.getElements("link", $),
          url: request.loadedUrl,
          prop: "href",
        });

        await utils.handleStatics({
          filesSet: scriptsSet,
          dirPath: path.join(websitePath, "js"),
          ext: ".js",
          pagePath: filePath,
          elements: utils.getElements("srcipt", $),
          url: request.loadedUrl,
          prop: "src",
        });

        await utils
          .createPathIfNotExists(path.dirname(filePath))
          .then(() => utils.writeHtml(filePath, $.html()));

        await Apify.utils.enqueueLinks({
          requestQueue,
          $,
          baseUrl: request.loadedUrl,
        });
      } else {
        await utils
          .createPathIfNotExists(path.dirname(filePath))
          .then(() => utils.downloadFile(request.loadedUrl, filePath));
      }
    },
    handleFailedRequestFunction: () =>
      console.log("Could not get " + request.url),
  });

  return crawler.run();
}

module.exports = {
  downloadWebsite,
};

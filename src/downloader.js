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
      const filePath = utils.getFileName(
        path.join(websitePath, URL.parse(request.loadedUrl).path),
        "." + contentType.type.split("/")[1],
        "index"
      );

      await utils.createPathIfNotExists(path.dirname(filePath));

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

        const paths = []
        await Apify.utils.enqueueLinks({
          requestQueue,
          $,
          baseUrl: request.loadedUrl,
          pseudoUrls: [url + "[.+]"],
          transformRequestFunction: request => {
            const pagePath = path.join(websitePath, URL.parse(request.url).path);
            paths.push({
              [request.url]: utils.getFileName(
                pagePath,
                path.extname(pagePath) || '.html',
                'index'
              )
            })
            return request
          }
        });

        utils.updatePaths(
          utils.getElements('a', $),
          'href',
          filePath,
          request.loadedUrl
        )(paths)

        await utils.writeHtml(filePath, $.html());

      } else {
        await utils.downloadFile(request.loadedUrl, filePath);
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

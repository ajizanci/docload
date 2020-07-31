const URL = require("url");
const path = require("path");
const Apify = require("apify");
const utils = require("./utils.js");

async function downloadWebsite(url) {
  const requestQueue = await Apify.openRequestQueue();
  const websitePath = path.join("sites", URL.parse(url).hostname);
  const stylesSet = new Set();
  const scriptsSet = new Set();

  await requestQueue.addRequest({ url });

  const crawler = new Apify.CheerioCrawler({
    requestQueue,
    handlePageFunction,
    handleFailedRequestFunction: ({ request }) =>
      console.log("Could not get " + request.url),
  });

  async function handlePageFunction({ request, contentType, $ }) {
    console.log("Downloading " + request.loadedUrl);
    const filePath = utils.getFileName(
      path.join(websitePath, URL.parse(request.loadedUrl).path),
      "." + contentType.type.split("/")[1],
      "index"
    );

    await utils.handleStatics({
      filesSet: stylesSet,
      dirPath: path.join(websitePath, "css"),
      ext: ".css",
      pagePath: filePath,
      elements: utils.getElements("link[rel=stylesheet]", $),
      url: request.loadedUrl,
      prop: "href",
    });

    await utils.handleStatics({
      filesSet: scriptsSet,
      dirPath: path.join(websitePath, "js"),
      ext: ".js",
      pagePath: filePath,
      elements: utils.getElements("script", $),
      url: request.loadedUrl,
      prop: "src",
    });

    const links = utils
      .getElements("a", $)
      .filter((a) => a.attribs.href && !a.attribs.href.includes("#"))
      .map((a) => utils.getAbsUrl(a.attribs.href, request.loadedUrl))
      .filter((a) => a.href.substring(0, url.length) === url);

    const paths = links.map((link) => {
      const pagePath = path.join(websitePath, link.pathname);
      return {
        [link.href]: utils.getFileName(
          pagePath,
          path.extname(pagePath) || ".html",
          "index"
        ),
      };
    });

    await Promise.all(
      links.map((link) =>
        requestQueue.addRequest(new Apify.Request({ url: link.href }))
      )
    );

    utils.updatePaths(
      utils.getElements("a", $),
      "href",
      filePath,
      request.loadedUrl
    )(paths);

    await utils
      .createPathIfNotExists(path.dirname(filePath))
      .then(() => utils.writeHtml(filePath, $.html()));

    console.log("Downloaded " + request.loadedUrl);
  }

  await crawler.run();
  return websitePath;
}

module.exports = {
  downloadWebsite,
};

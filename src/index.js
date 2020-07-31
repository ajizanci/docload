#!/usr/bin/env node

const { program } = require("commander");
const { downloadWebsite } = require("./downloader.js");
const zipper = require("./zipper");

program
  .version("1.0.2")
  .description("Docload is a tool for downloading documentation sites");

program.option("-z, --zip", "zip created folder");

program
  .command("get <website_url>")
  .description("Download Website")
  .action((website_url) => {
    downloadWebsite(website_url)
      .then((dir) => program.zip && zipper(dir))
      .catch((err) => console.log(err, "An error occured."));
  });

program.parse(process.argv);

if (!process.argv.slice(2).length) {
  program.help();
}

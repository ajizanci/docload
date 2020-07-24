#!/usr/bin/env node

const { program } = require("commander");
const { downloadWebsite } = require("./downloader.js");

program
  .version("0.0.1")
  .description("Docload is a tool for downloading documentation sites");

program
  .command("get <website_url>")
  .description("Download Website")
  .action((website_url) => downloadWebsite(website_url).catch((err) => console.log("An error occured.")));

program.parse(process.argv);

if (!process.argv.slice(2).length) {
  program.help();
}

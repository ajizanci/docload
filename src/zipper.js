const archiver = require("archiver");
const fs = require("fs");
const path = require("path");

module.exports = (dir) =>
  new Promise((resolve, reject) => {
    const archive = archiver("zip", {
      zlib: { level: 9 },
    });
    const output = fs.createWriteStream(
      path.join(path.dirname(dir), path.basename(dir) + ".zip")
    );

    console.log("Zipping " + dir);
    archive.pipe(output);
    archive.on("error", (err) => reject(err));

    output.on("close", () => {
      console.log("Zipped " + dir);
      resolve();
    });
    archive.directory(dir, false).finalize();
  });

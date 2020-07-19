const axios = require("axios")
const cheerio = require("cheerio")
const fs = require("fs")
const url = require("url")
const path = require("path")

function createDirectories(pathString) {
    let pathBuilder = '';

    for (let i = 0; i < pathString.length; i++) {
        pathBuilder += pathString[i]
        if (pathString[i] == '/') {
            fs.mkdir(pathBuilder, err => err && console.log(err))
        }
    }
}

async function main() {
    
}

const getFileStream = async (url) => (await axios.get(url, { responseType: 'stream' })).data

const downloadFile = async (url, path) => {
    const writeStream = fs.createWriteStream(path),
            readStream = await getFileStream(url);

    readStream.pipe(writeStream)
    readStream.on('error', (err) => {
        throw err
    })
}

main()
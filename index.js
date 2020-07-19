const axios = require("axios")
const cheerio = require("cheerio")
const fs = require("fs")
const URL = require("url")
const path = require("path")

const pathExists = (pathString) => {
    return new Promise((resolve, reject) => {
        fs.exists(pathString, (err, exists) => {
            if (err) reject(err)
            else resolve(exists)
        })
    })
}

async function createPathIfNotExists(pathString) {
    if (await pathExists(pathString))
        return

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

const getPageName = pathString => {
    if (/\.html$/.test(pathString)) {
        return pathString
    } else if (pathString[pathString.length - 1] == '/') {
        return pathString + 'index.html'
    } else {
        return pathString + '.html'
    }
}

async function downloadPage(url) {
    const resolvedUrl = URL.parse(url)
    createPathIfNotExists(resolvedUrl.host+'/')
}
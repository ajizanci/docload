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

async function test() {
    let { data: html } = await axios.get("http://localhost:8080/")
    html = cheerio.load(html)
    const styles = html('link[rel=stylesheet]')
    html(styles).each(async (i, style) => {
        const styleWriteStream = fs.createWriteStream(style.attribs.href) 
        const { data: styleReadStream } = await axios.get('http://localhost:8080/'+style.attribs.href, {
            method: 'GET',
            responseType: 'stream'
        })
        styleReadStream.pipe(styleWriteStream)
        styleReadStream.on('finish', () => console.log("Helllll"))
    })
    // const line = html('.line')
    // html(line).each((i, line) => console.log(line))

}

test()
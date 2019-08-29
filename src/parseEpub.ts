import fs from 'mz/fs'
import Zip, { JSZipObject } from 'jszip'
import { parseOpf } from './parseOpf'
import { parseNav, parseNcx } from './parseNav'
import { File } from './file'
import { xml2obj } from './utils'


function getRoot(opfPath) {
  return opfPath.replace(/[^\/]+$/, '').replace(/^\//, '')
}

export class Epub {
  private buffer: Buffer
  private zip: any
  private root: string
  private opfPath: string
  version: string
  manifest: File[]
  spine: any
  nav: any
  metadata: {
    title: string
    creators: string[]
    description: string
    language: string[]
    isbn: string
    asin: string
  }

  constructor(buffer) {
    this.buffer = buffer
  }

  private handlePath(path) {
    let newPath

    if (path[0] === '/') {
      // use absolute path, root is zip root
      newPath = path.substr(1)
    } else {
      newPath = this.root + path
    }

    return decodeURI(newPath)
  }

  private getZipFile(path: string): JSZipObject {
    let fullPath = this.handlePath(path)

    const file = this.zip.file(fullPath)

    if (file) {
      return file
    } else {
      throw new Error(`${fullPath} not found!`)
    }
  }

  private setZipFile(path: string, data: string | Buffer) {
    let fullPath = this.handlePath(path)
    this.zip.file(fullPath, data)
  }

  async getFileText(path: string): Promise<string> {
    const file = this.getZipFile(path)
    return file.async('text')
  }

  async setFileText(path: string, data: string) {
    this.setZipFile(path, data)
  }

  private async getOpfPath() {
    const containerObj = xml2obj(await this.getFileText('/META-INF/container.xml'))
    return '/' + containerObj.container.rootfiles.rootfile.attr['full-path']
  }

  async getOpf() {
    return this.getFileText(this.opfPath)
  }

  async setOpf(xml) {
    this.setZipFile(this.opfPath, xml)
  }

  private findFile(query) {
    const keys = Object.keys(query)

    const findFn = file => {
      for (let key of keys) {
        if (file[key] !== query[key]) return false
      }

      return true
    }

    return this.manifest.find(findFn)
  }

  async parse() {
    this.zip = await Zip.loadAsync(this.buffer, { base64: false, checkCRC32: true })
    this.opfPath = await this.getOpfPath()
    this.root = getRoot(this.opfPath)

    const opfXml = await this.getFileText(this.opfPath)
    const opf = parseOpf(opfXml)

    const manifest = opf.manifest.map(item => {
      return new File(item, this)
    })

    const ncxId = opf.ncxId
    Object.assign(this, opf, { manifest })

    const versionNum = parseFloat(this.version)
    if (versionNum >= 3) {
      this.nav = parseNav(await this.findFile({ properties: 'nav'}).getText())
    } else {
      const ncxXml = await this.findFile({ id: ncxId}).getText()
      this.nav = { toc: parseNcx(ncxXml) }
    }
  }

  async toBuffer(): Promise<Buffer> {
    return this.zip.generateAsync({type: 'nodebuffer'}, {
      compression: 'DEFLATE',
      compressionOptions: { level: 9 }
    })
  }
}

export default async function parseEpub(file: string | Buffer) {
  const buffer = typeof file === 'string' ?
    await fs.readFile(file) :
    file

  const epub = new Epub(buffer)
  await epub.parse()

  return epub
}

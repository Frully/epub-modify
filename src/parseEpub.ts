import * as pathUtil from 'path'
import fs from 'mz/fs'
import Zip, { JSZipObject } from 'jszip'
import { parseOpf } from './parseOpf'
import { parseNav, parseNcx } from './parseNav'
import { Item } from './item'
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
  manifest: Item[]
  itemIndex: any
  spine: any[]
  nav: any
  metadata: {
    title: string
    creators: any[]
    publisher: string
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
      newPath = pathUtil.join(this.root, path)
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
    let opfPath = containerObj.container.rootfiles.rootfile.attr['full-path']

    const file = await this.zip.file(opfPath)

    if (!file) {
      const opfFiles = this.zip.filter((_, opfFile) => {
        return !opfFile.dir && opfFile.name.match(/content\.opf$/)
      })

      if (opfFiles.length === 0) {
        throw new Error('Cannot find OPF file')
      }

      opfPath = opfFiles[0].name
    }

    return '/' + opfPath
  }

  async getOpf() {
    return this.getFileText(this.opfPath)
  }

  async setOpf(xml) {
    this.setZipFile(this.opfPath, xml)
  }

  private createItemIndex() {
    this.itemIndex = {}

    this.manifest.forEach(item => this.itemIndex[item.id] = item)
  }

  private findItemById(id) {
    return this.itemIndex[id]
  }

  private findItem(query) {
    let items
    if (query.id) {
      items = [this.findItemById(query.id)]
    } else {
      items = this.manifest
    }

    const keys = Object.keys(query)

    const findFn = file => {
      for (let key of keys) {
        if (file[key] !== query[key]) return false
      }

      return true
    }

    return items.find(findFn)
  }

  async parse() {
    this.zip = await Zip.loadAsync(this.buffer, { base64: false, checkCRC32: true })
    this.opfPath = await this.getOpfPath()
    this.root = getRoot(this.opfPath)

    const opfXml = await this.getFileText(this.opfPath)
    const opf = parseOpf(opfXml)

    this.version = opf.version
    this.metadata = opf.metadata

    this.manifest = opf.manifest.map(item => {
      return new Item(item, this)
    })

    this.createItemIndex()

    this.spine = opf.spine.map(itemref => {
      return {
        ...itemref,
        item: this.findItemById(itemref.idref),
      }
    })

    const navFile = this.findItem({ properties: 'nav' })

    if (navFile) {
      this.nav = parseNav(await navFile.getText())
    } else {
      let ncxFile
      if (opf.ncxId) {
        ncxFile = this.findItemById(opf.ncxId)
      }
      if (!ncxFile) {
        ncxFile = this.findItem({ 'media-type': 'application/x-dtbncx+xml' })
      }
      this.nav = {}
      if (ncxFile) {
        const ncxXml = await ncxFile.getText()
        this.nav.toc = parseNcx(ncxXml)
      }
    }
  }

  async toBuffer(): Promise<Buffer> {
    return this.zip.generateAsync({
      type: 'nodebuffer',
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

import { Epub } from './parseEpub'

type ItemData = {
  id: string
  href: string
  'media-type': string
  properties?: string
}

export class Item {
  epub: Epub
  id: string
  href: string
  'media-type': string
  properties?: string
  isExists: boolean

  constructor(data: ItemData, epub: Epub) {
    this.epub = epub
    this.id = data.id
    this.href = data.href
    this['media-type'] = data['media-type']
    this.properties = data.properties
    this.isExists = this.epub.isFileExists(this.href)
  }

  async getText() {
    return this.epub.getFileText(this.href)
  }

  async setText(text) {
    await this.epub.setFileText(this.href, text)
  }
}
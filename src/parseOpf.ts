import htmlToText from 'html-to-text'
import { xml2obj } from './utils'

function getArray(val) {
  if (!val) {
    return []
  } else if (Array.isArray(val)) {
    return val
  } else {
    return [val]
  }
}

function parseIdentifier(metadataObj) {
  const identifiers = getArray(metadataObj['identifier'])

  let isbn
  let asin


  identifiers.map(row => {
    const id = row['#text']
    if (!id) {
      return
    }

    const type = row.attr.scheme

    if (type && type.match(/^(e-?)?isbn/i)) {
      isbn = id

    } else if (type && type.match(/^(mobi-)?asin/i)) {
      asin = id

    } else if (id.match(/^(URN:ISBN|ISBN):?(.+)/i)) {
      isbn = id.match(/^(?:URN:ISBN:|ISBN):?(.+)/i)[1]

    } else if (id.match(/^URN:ASIN:/i)) {
      asin = id.match(/^URN:ASIN:(.+)/i)[1]

    } else if (row.attr.id && row.attr.id.match(/^e?isbn(\d{10,13})$/i)) {
      isbn = row.attr.id.match(/^e?isbn(\d{10,13})$/i)[1]
    }
  })

  if (isbn) {
    isbn = isbn.replace(/\s|-|\./g, '')
    if (isbn.length !== 10 && isbn.length !== 13) isbn = undefined
  }
  if (asin) {
    asin = asin.replace(/\s|-/g, '')
    if (asin.length !== 10) asin = undefined
  }

  return { isbn, asin }
}

export function parseMetadata(opfObj) {
  const metadataObj = opfObj.package.metadata
  let title = metadataObj.title

  let creators = getArray(metadataObj.creator).map(creator => {
    return {
      name: creator['#text'],
      role: creator.attr && creator.attr.role,
    }
  })

  let { isbn, asin } = parseIdentifier(metadataObj)

  const description = metadataObj.description && htmlToText.fromString(metadataObj.description, {
    wordwrap: false,
    ignoreImage: true,
  }).trim()

  const language = getArray(metadataObj.language)

  return {
    title,
    creators,
    description,
    language,
    isbn,
    asin,
  }
}

export interface Item {
  id: string,
  href: string,
  'media-type': string,
  properties: string | undefined,
}

export function parseManifest(opfObj): Item[] {
  return opfObj.package.manifest.item.map(elem => elem.attr)
}

export function parseSpine(opfObj): any {
  return getArray(opfObj.package.spine.itemref).map(itemref => itemref.attr.idref)
}

export function parseOpf(xml) {
  const opfObj: any = xml2obj(xml)

  return {
    version: opfObj.package.attr.version,
    metadata: parseMetadata(opfObj),
    manifest: parseManifest(opfObj),
    spine: parseSpine(opfObj),
  }
}
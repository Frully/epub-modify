import fs from 'mz/fs'

import { xml2obj } from './utils'
import { parseMetadata, parseManifest, parseSpine, parseOpf } from './parseOpf'

const baseDir = process.cwd()

async function readToXml(filename) {
  return await fs.readFile(`${baseDir}/fixtures/${filename}`, 'utf8')
}

async function readToXmlObj(filename) {
  const opfXml = await readToXml(filename)
  return xml2obj(opfXml)
}

describe('parseOpf.ts', () => {
  describe('parseMetadata()', () => {
    test('Result should have data', async () => {
      const opfObj = await readToXmlObj('opf1.opf')
      const metadata = parseMetadata(opfObj)

      expect(metadata).toMatchObject({
        title: 'Your title here',
        creators: [
          { name: 'Hingle McCringleberry' },
        ],
        language: ['en'],
      })
    })

    test('Result should have isbn or asin', async () => {
      const opfObj = await readToXmlObj('opf2.opf')
      const metadata = parseMetadata(opfObj)

      expect(metadata).toMatchObject({
        title: 'Good Omens: Belas maldições',
        creators: [
          { name: 'Neil Gaiman', role: 'aut' },
          { name: 'Terry Pratchett', role: 'aut' }
        ],
        language: ['pt'],
        asin: 'B07RLVVZS1',
      })
    })

    test('Result should have isbn or asin 2', async () => {
      const opfObj = await readToXmlObj('opf3.opf')
      const metadata = parseMetadata(opfObj)

      expect(metadata).toMatchObject({
        isbn: '9780395404256',
      })
    })

    test('Result should have data 2', async () => {
      const opfObj = await readToXmlObj('opf4.opf')
      const metadata = parseMetadata(opfObj)

      expect(metadata).toMatchObject({
        title: 'Entre rinhas de cachorros e porcos abatidos',
      })
    })
  })

  describe('parseManifest()', () => {
    test('Result should have data', async () => {
      const opfObj = await readToXmlObj('opf1.opf')
      const manifest = parseManifest(opfObj)

      expect(manifest.length).toBe(9)
      expect(manifest[0]).toMatchObject({
        id: 'cover.css',
        href: 'css/cover.css',
        'media-type': 'text/css',
      })
      expect(manifest[8]).toMatchObject({
        id: 'section0002.xhtml',
        href: 'xhtml/section0002.xhtml',
        'media-type': 'application/xhtml+xml',
      })
    })
  })

  describe('parseSpine()', () => {
    test('Result should have data', async () => {
      const opfObj = await readToXmlObj('opf1.opf')
      const { ncxId, spine } = parseSpine(opfObj)

      expect(ncxId).toBe('ncx')
      expect(spine.length).toBe(3)
      expect(spine).toMatchObject([
        'cover.xhtml',
        'section0001.xhtml',
        'section0002.xhtml',
      ])
    })
  })

  describe('parseOpf()', () => {
    test('Result should have data', async () => {
      const opfXml = await readToXml('opf1.opf')
      const opf = await parseOpf(opfXml)

      expect(opf.version).toBe('3.0')
      expect(opf).toHaveProperty('metadata')
      expect(opf).toHaveProperty('manifest')
      expect(opf).toHaveProperty('spine')
    })

    test('Result should have data 2', async () => {
      const opfXml = await readToXml('opf5.opf')
      const opf = await parseOpf(opfXml)

      expect(opf.version).toBe('1.0')
      expect(opf).toHaveProperty('metadata')
      expect(opf).toHaveProperty('manifest')
      expect(opf).toHaveProperty('spine')
    })
  })
})
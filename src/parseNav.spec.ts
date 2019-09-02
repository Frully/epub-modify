import fs from 'mz/fs'

import { parseNav, parseNcx } from './parseNav'

const baseDir = process.cwd()

async function readToText(filename) {
  return await fs.readFile(`${baseDir}/fixtures/${filename}`, 'utf8')
}

describe('parseNav.ts', () => {
  describe('parseNav()', () => {
    test('Result should have data', async () => {
      const html = await readToText('nav1.xhtml')
      const nav = parseNav(html)

      expect(nav.toc).toHaveLength(141)
      expect(nav.toc[0]).toMatchObject({
        href: 'titlepage.xhtml',
        title: 'Moby-Dick'
      })
      expect(nav.toc[140]).toMatchObject({
        href: 'copyright.xhtml',
        title: 'Copyright Page'
      })
      expect(nav.landmarks).toHaveLength(3)
    })

    test.todo('嵌套导航')
    test.todo('导航类型')
  })

  describe('parseNcx()', () => {
    test('Result should have data', async () => {
      const xml = await readToText('ncx1.ncx')
      const toc = parseNcx(xml)

      expect(toc).toHaveLength(2)
      expect(toc[0]).toMatchObject({
        href: 'xhtml/section0001.xhtml',
        title: 'Ladle Rat Rotten Hut'
      })
    })

    test('Result should have data 2', async () => {
      const xml = await readToText('ncx2.ncx')
      const toc = parseNcx(xml)

      expect(toc).toHaveLength(1)
      expect(toc[0]).toMatchObject({
        href: 'titlepage.xhtml',
        title: 'Start'
      })
    })
  })
})
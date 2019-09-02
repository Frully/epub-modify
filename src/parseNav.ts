import cheerio from 'cheerio'
import { xml2obj } from './utils'

export function parseNav(html): any {
  const $ = cheerio.load(html)

  const nav = {}

  $('nav').each((i, elem) => {
    const $nav = $(elem)
    const type = $nav.attr('epub:type')

    nav[type] = $nav.find('ol > li').map((j, li) => {
      const $elem = $(li)
      return {
        title: $elem.find('a').text(),
        href: $elem.find('a').attr('href'),
      }
    }).get()
  })

  return nav
}

export function parseNcx(xml): any {
  const ncxObj = xml2obj(xml)

  const navPoints = Array.isArray(ncxObj.ncx.navMap.navPoint)
    ? ncxObj.ncx.navMap.navPoint
    : [ncxObj.ncx.navMap.navPoint]
    
  return navPoints.map(navPoint => {
    return {
      title: navPoint.navLabel.text,
      href: navPoint.content.attr.src,
    }
  })
}
import xmlParser from 'fast-xml-parser'

export function xml2obj(xml) {
  return xmlParser.parse(xml, {
    attributeNamePrefix: '',
    attrNodeName: 'attr',
    ignoreAttributes: false,
  })
}
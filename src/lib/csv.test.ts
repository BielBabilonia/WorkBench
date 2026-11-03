import { describe, expect, it } from 'vitest'
import { csvDelimiter, toCsv } from './csv'

describe('toCsv', () => {
  it('quotes fields with delimiters, quotes and line breaks', () => {
    expect(toCsv([['a', 'b,c', 'say "hi"', 'two\nlines']])).toBe('a,"b,c","say ""hi""","two\nlines"')
  })

  it('separates rows with CRLF', () => {
    expect(toCsv([['a'], ['b']])).toBe('a\r\nb')
  })

  it('neutralizes spreadsheet formulas', () => {
    expect(toCsv([['=SUM(A1)', '+1', '-2', '@cmd']])).toBe("'=SUM(A1),'+1,'-2,'@cmd")
  })

  it('uses the delimiter Excel expects for the locale', () => {
    expect(csvDelimiter('en')).toBe(',')
    expect(csvDelimiter('pt-BR')).toBe(';')
    expect(toCsv([['1,5', 'x']], ';')).toBe('1,5;x')
  })
})

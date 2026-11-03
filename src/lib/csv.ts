/**
 * CSV that opens cleanly in Excel: BOM for UTF-8, quoted fields, and the
 * delimiter Excel expects for the locale (";" where the decimal separator is ",").
 */

export function csvDelimiter(locale: string): ',' | ';' {
  const decimal = new Intl.NumberFormat(locale).formatToParts(1.5).find((p) => p.type === 'decimal')?.value
  return decimal === ',' ? ';' : ','
}

function escapeField(value: string, delimiter: string): string {
  // Cells starting with these run as formulas in spreadsheets (CSV injection).
  const safe = /^[=+\-@\t\r]/.test(value) ? `'${value}` : value
  return new RegExp(`["\\r\\n${delimiter}]`).test(safe) || safe !== safe.trim()
    ? `"${safe.replace(/"/g, '""')}"`
    : safe
}

export function toCsv(rows: readonly (readonly (string | number)[])[], delimiter: ',' | ';' = ','): string {
  return rows.map((row) => row.map((cell) => escapeField(String(cell), delimiter)).join(delimiter)).join('\r\n')
}

export function downloadCsv(fileName: string, csv: string) {
  const blob = new Blob(['﻿', csv], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = fileName
  link.click()
  URL.revokeObjectURL(url)
}

/** Minimal GitHub-flavored Markdown table builder — just enough for this report. */
export function table(headers: string[], rows: string[][]): string {
  const headerRow = `| ${headers.join(' | ')} |`;
  const separator = `| ${headers.map(() => '---').join(' | ')} |`;
  const bodyRows = rows.map((row) => `| ${row.join(' | ')} |`);
  return [headerRow, separator, ...bodyRows].join('\n');
}

export const pct = (n: number) => `${n.toFixed(1)}%`;
export const num = (n: number) => n.toFixed(1);

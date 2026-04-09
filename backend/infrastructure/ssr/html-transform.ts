const VITE_DEV_ENTRY = '<script type="module" src="/main.ts"></script>';

export function toProductionHtml(html: string): string {
  return html
    .replaceAll(VITE_DEV_ENTRY, '')
    .replace(/href="(styles-[^"]+\.css)"/g, 'href="/$1"')
    .replace(/href="(favicon\.ico)"/g, 'href="/$1"')
    .replace(/href="(chunk-[^"]+\.js)"/g, 'href="/$1"')
    .replace(/src="(main-[^"]+\.js)"/g, 'src="/$1"')
    .replace(/href="(main-[^"]+\.js)"/g, 'href="/$1"')
    .replace(/href="(chunk-[^"]+\.css)"/g, 'href="/$1"');
}

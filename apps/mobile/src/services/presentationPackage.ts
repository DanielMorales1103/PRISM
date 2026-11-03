import JSZip from 'jszip';

function mimeTypeForFile(fileName: string) {
  const extension = fileName.split('.').pop()?.toLowerCase();
  const types: Record<string, string> = {
    avif: 'image/avif', css: 'text/css', gif: 'image/gif', jpeg: 'image/jpeg', jpg: 'image/jpeg', js: 'text/javascript', mp3: 'audio/mpeg', mp4: 'video/mp4', png: 'image/png', svg: 'image/svg+xml', wav: 'audio/wav', webm: 'video/webm', webp: 'image/webp',
  };
  return types[extension ?? ''] ?? 'application/octet-stream';
}

function resolvePath(basePath: string, reference: string) {
  const path = reference.split(/[?#]/, 1)[0];
  if (!path || /^(?:data:|https?:|#|mailto:|tel:)/i.test(path)) return null;
  const parts = [...basePath.split('/'), ...path.replace(/^\/+/, '').split('/')];
  const resolved: string[] = [];
  parts.forEach((part) => {
    if (!part || part === '.') return;
    if (part === '..') { resolved.pop(); return; }
    resolved.push(part);
  });
  return resolved.join('/');
}

function inlineReferences(content: string, basePath: string, files: Map<string, string>) {
  const replaceReference = (reference: string) => {
    const resolved = resolvePath(basePath, reference);
    return resolved ? files.get(resolved) ?? reference : reference;
  };

  return content
    .replace(/url\(\s*(['"]?)([^'"\)]+)\1\s*\)/gi, (_match, _quote, reference) => `url("${replaceReference(reference.trim())}")`)
    .replace(/@import\s+(?:url\()?\s*['"]([^'"]+)['"][\s\)]*;/gi, (_match, reference) => `@import url("${replaceReference(reference.trim())}");`)
    .replace(/\b(src|href)\s*=\s*(['"])([^'"]+)\2/gi, (_match, attribute, quote, reference) => `${attribute}=${quote}${replaceReference(reference.trim())}${quote}`);
}

export async function presentationHtmlFromArchive(archive: ArrayBuffer) {
  const zip = await JSZip.loadAsync(archive);
  const index = zip.file('index.html');
  if (!index) throw new Error('El ZIP debe incluir un archivo index.html en su carpeta principal.');

  const files = new Map<string, string>();
  const entries = Object.values(zip.files).filter((file) => !file.dir && file.name !== 'index.html');

  await Promise.all(entries.filter((file) => !file.name.toLowerCase().endsWith('.css')).map(async (file) => {
    files.set(file.name, `data:${mimeTypeForFile(file.name)};base64,${await file.async('base64')}`);
  }));

  await Promise.all(entries.filter((file) => file.name.toLowerCase().endsWith('.css')).map(async (file) => {
    const css = inlineReferences(await file.async('string'), file.name.split('/').slice(0, -1).join('/'), files);
    files.set(file.name, `data:text/css;base64,${btoa(unescape(encodeURIComponent(css)))}`);
  }));

  return inlineReferences(await index.async('string'), '', files);
}

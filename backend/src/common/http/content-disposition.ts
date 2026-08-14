export type ContentDispositionType = 'attachment' | 'inline';

function normalizeFilename(filename: string): string {
  return (
    String(filename || 'download')
      .replace(/[\u0000-\u001F\u007F]/g, ' ')
      .replace(
        /[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/g,
        '\uFFFD',
      )
      .replace(/\s+/g, ' ')
      .trim() || 'download'
  );
}

function asciiFilenameFallback(filename: string): string {
  const fallback = filename
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\x20-\x7E]/g, '_')
    .replace(/["\\]/g, '_')
    .replace(/\s+/g, ' ')
    .trim();
  return fallback || 'download';
}

function encodeRfc5987Value(value: string): string {
  return encodeURIComponent(value).replace(
    /[!'()*]/g,
    (character) => `%${character.charCodeAt(0).toString(16).toUpperCase()}`,
  );
}

export function contentDisposition(
  filename: string,
  type: ContentDispositionType = 'attachment',
): string {
  const normalized = normalizeFilename(filename);
  const fallback = asciiFilenameFallback(normalized);
  return `${type}; filename="${fallback}"; filename*=UTF-8''${encodeRfc5987Value(normalized)}`;
}

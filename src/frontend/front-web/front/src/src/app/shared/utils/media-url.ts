import { environment } from '../../../environment/environment';

function getApiAssetBase(): string {
  return environment.apiUrl.replace(/\/api\/?$/i, '');
}

function withLeadingSlash(value: string): string {
  return value.startsWith('/') ? value : `/${value}`;
}

export function resolveWebMediaUrl(value?: string | null): string {
  const trimmed = value?.trim();
  if (!trimmed) {
    return '';
  }

  if (/^(data:|blob:|https?:\/\/|\/\/)/i.test(trimmed)) {
    return trimmed;
  }

  if (trimmed.startsWith('/assets/')) {
    return encodeURI(trimmed);
  }

  const normalizedPath = withLeadingSlash(trimmed);
  if (normalizedPath.startsWith('/images/')) {
    const apiAssetBase = getApiAssetBase();
    return encodeURI(apiAssetBase ? `${apiAssetBase}${normalizedPath}` : normalizedPath);
  }

  return encodeURI(normalizedPath);
}

export function normalizeMediaRow<T extends { url?: string | null }>(row: T): T {
  return {
    ...row,
    url: resolveWebMediaUrl(row.url),
  };
}

export function normalizeMediaRows<T extends { url?: string | null }>(rows?: T[] | null): T[] {
  return (rows ?? [])
    .map((row) => normalizeMediaRow(row))
    .filter((row) => !!row.url);
}

export function normalizeEntityMedia<T extends { mainImageUrl?: string | null; images?: Array<{ url?: string | null }> | null }>(
  entity: T,
): T {
  return {
    ...entity,
    mainImageUrl: resolveWebMediaUrl(entity.mainImageUrl),
    images: normalizeMediaRows(entity.images),
  };
}

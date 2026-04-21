import { createHash } from 'node:crypto';

export function hashText(input: string): string {
  return createHash('sha256').update(input).digest('hex');
}

export function stableJsonHash(value: unknown): string {
  return hashText(stableStringify(value));
}

function stableStringify(value: unknown): string {
  return JSON.stringify(sortValue(value));
}

function sortValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(sortValue);
  }

  if (value && typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, val]) => [key, sortValue(val)]);
    return Object.fromEntries(entries);
  }

  return value;
}
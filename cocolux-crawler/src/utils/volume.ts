import { cleanText } from './text';

export type ParsedVolume = {
  raw: string | null;
  value: number | null;
  unit: string | null;
};

const VOLUME_REGEX =
  /(\d+(?:[.,]\d+)?)\s*(ml|g|kg|mg|l|pcs|pc|mieng|miếng|capsules|viên)/i;

export function parseVolume(input: string | null | undefined): ParsedVolume {
  const text = cleanText(input);
  if (!text) {
    return { raw: null, value: null, unit: null };
  }

  const match = text.match(VOLUME_REGEX);
  if (!match) {
    return { raw: null, value: null, unit: null };
  }

  const raw = cleanText(match[0]);
  const value = Number(match[1].replace(',', '.'));
  const unit = cleanText(match[2])?.toLowerCase() ?? null;

  return {
    raw,
    value: Number.isFinite(value) ? value : null,
    unit,
  };
}
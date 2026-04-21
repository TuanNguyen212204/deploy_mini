export type MatchMethod = 'barcode' | 'brand_name_exact' | 'fuzzy_name' | 'singleton';

export type MatchCandidate = {
  recordId: string;
  productUrl: string | null;
  brandName: string | null;
  barcode: string | null;
  normalizedName: string | null;
  score: number;
  method: MatchMethod;
};

export type MatchedGroup = {
  matchGroupId: string;
  canonicalRecordId: string;
  method: MatchMethod;
  confidence: number;
  brandName: string | null;
  barcode: string | null;
  canonicalName: string | null;
  memberRecordIds: string[];
  memberUrls: string[];
  candidates: MatchCandidate[];
  createdAt: string;
};

export type MatchedProductRecord = {
  recordId: string;
  productUrl: string | null;
  brandName: string | null;
  barcode: string | null;
  normalizedName: string | null;
  matchGroupId: string;
  canonicalRecordId: string;
  method: MatchMethod;
  confidence: number;
  createdAt: string;
};

export type MatchSummary = {
  totalNormalizedRecords: number;
  totalMatchedRecords: number;
  totalGroups: number;
  barcodeGroups: number;
  brandNameExactGroups: number;
  fuzzyGroups: number;
  singletonGroups: number;
};
export type RawCategory = {
  name: string;
  url: string;
  path: string;
  slug: string | null;
  parentName: string | null;
  parentSlug: string | null;
  level: number;
  crawledAt: string;
};

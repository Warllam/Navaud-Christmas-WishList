export const FAMILY_NAMES = [
  "Jean Louis",
  "Crista",
  "Pilou",
  "Paul",
  "Jules",
  "JJ",
  "Laurie",
  "Marion",
] as const;

export type FamilyName = (typeof FAMILY_NAMES)[number];
